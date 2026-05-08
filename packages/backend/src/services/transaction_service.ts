import { PrismaClient, Transaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

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

      return txRecord;
    });

    await Promise.all([
      this.rewardService?.evaluateAfterSpend(params.user_id),
      this.gcaEvaluate?.(this.db, params.merchant_id),
    ]);

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
