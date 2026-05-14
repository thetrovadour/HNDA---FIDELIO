import { PrismaClient, Transaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const BRIDGE_HTTP_URL = process.env.BRIDGE_HTTP_URL ?? 'http://localhost:3002';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? 'change_me_in_production';

export class TransactionService {
  constructor(
    private db: PrismaClient,
    private rewardService?: { evaluateAfterSpend(user_id: string): Promise<void> },
    private gcaEvaluate?: (db: PrismaClient, merchantId: string) => Promise<void>,
  ) {}

  async recordSpend(params: {
    user_id: string;
    merchant_id: string;
    amount_catr: string;
  }): Promise<Transaction> {
    const user = await this.db.user.findUnique({ where: { id: params.user_id } });
    if (!user) throw new Error('User not found');

    const merchant = await this.db.merchant.findUnique({ where: { id: params.merchant_id } });
    if (!merchant) throw new Error('Merchant not found');

    const wallet = await this.db.wallet.findUnique({ where: { user_id: params.user_id } });
    if (!wallet) throw new Error('Wallet not found');

    const amount = new Decimal(params.amount_catr);
    if (wallet.catr_balance.lessThan(amount)) throw new Error('Insufficient CATR balance');

    const commission = amount.mul('0.036');
    // 3.6% × 65% treasury × 15% GCA reserve slice = 0.351% of amount
    const gcaReserveDeposit = commission.mul('0.65').mul('0.15');

    const transaction = await this.db.$transaction(async (tx: TxClient) => {
      const txRecord = await tx.transaction.create({
        data: {
          user_id: params.user_id,
          merchant_id: params.merchant_id,
          type: 'SPEND',
          status: 'CONFIRMED',
          amount_catr: amount,
          commission_catr: commission,
        },
      });

      await tx.merchantVisit.create({
        data: {
          user_id: params.user_id,
          merchant_id: params.merchant_id,
        },
      });

      await tx.wallet.update({
        where: { user_id: params.user_id },
        data: { catr_balance: { decrement: amount } },
      });

      await tx.gcaReserve.upsert({
        where:  { id: 'gca-reserve-singleton' },
        update: { balance_hnl: { increment: gcaReserveDeposit } },
        create: { id: 'gca-reserve-singleton', balance_hnl: gcaReserveDeposit },
      });

      return txRecord;
    });

    await Promise.all([
      this.rewardService?.evaluateAfterSpend(params.user_id),
      this.gcaEvaluate?.(this.db, params.merchant_id),
    ]);

    if (wallet.address && merchant.wallet_address) {
      const pending = await this.db.pendingTransfer.create({
        data: {
          transaction_id: transaction.id,
          from_wallet: wallet.address,
          to_wallet: merchant.wallet_address,
          amount_catr: amount,
        },
      });

      fetch(`${BRIDGE_HTTP_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bridge-secret': BRIDGE_SECRET },
        body: JSON.stringify({
          from_wallet: wallet.address,
          to_wallet: merchant.wallet_address,
          amount_catr: amount.toString(),
        }),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.tx_hash) {
          await this.db.pendingTransfer.update({
            where: { id: pending.id },
            data: { status: 'CONFIRMED', tx_hash: data.tx_hash, resolved_at: new Date(), attempts: 1 },
          });
        } else {
          await this.db.pendingTransfer.update({
            where: { id: pending.id },
            data: { attempts: 1, last_attempt_at: new Date() },
          });
          console.error('[spend/transfer] Bridge error:', data);
        }
      }).catch(async (err) => {
        await this.db.pendingTransfer.update({
          where: { id: pending.id },
          data: { attempts: 1, last_attempt_at: new Date() },
        });
        console.error('[spend/transfer] Bridge unreachable:', err);
      });
    }

    return transaction;
  }

  async getUserTransactions(
    user_id: string,
    page: number,
    limit: number,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const [transactions, total] = await Promise.all([
      this.db.transaction.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.transaction.count({ where: { user_id } }),
    ]);

    return { transactions, total };
  }
}
