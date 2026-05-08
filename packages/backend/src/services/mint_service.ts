import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { PaymentEventDTO, BridgeResponse } from '../types';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class MintService {
  constructor(
    private db: PrismaClient,
    private rewardService?: { evaluateAfterMint(user_id: string): Promise<void> },
  ) {}

  async receivePaymentEvent(event: PaymentEventDTO): Promise<BridgeResponse> {
    // 1. Check ProcessedReference — duplicate guard
    const existing = await this.db.processedReference.findUnique({
      where: { reference_code: event.reference_code },
    });
    if (existing) {
      return { status: 'NACK', reference_code: event.reference_code, reason: 'Duplicate reference_code' };
    }

    // 2. Check PendingMint with status MINTED — duplicate guard
    const mintedRow = await this.db.pendingMint.findUnique({
      where: { reference_code: event.reference_code },
    });
    if (mintedRow && mintedRow.status === 'MINTED') {
      return { status: 'NACK', reference_code: event.reference_code, reason: 'Already minted' };
    }

    // 3. Atomic write: PendingMint + ProcessedReference + Transaction (if wallet found)
    await this.db.$transaction(async (tx: TxClient) => {
      const wallet = await tx.wallet.findUnique({
        where: { address: event.client_wallet },
      });

      let transactionId: string | undefined;

      if (wallet) {
        const txRecord = await tx.transaction.create({
          data: {
            user_id: wallet.user_id,
            type: 'MINT',
            status: 'PENDING',
            amount_catr: new Decimal(event.amount_lempiras.toString()),
            amount_lempiras: new Decimal(event.amount_lempiras.toString()),
            reference_code: event.reference_code,
          },
        });
        transactionId = txRecord.id;
      }

      await tx.pendingMint.create({
        data: {
          reference_code: event.reference_code,
          client_wallet: event.client_wallet,
          amount_lempiras: new Decimal(event.amount_lempiras.toString()),
          source: event.source,
          status: 'PENDING',
          received_at: new Date(event.received_at * 1000),
          transaction_id: transactionId,
        },
      });

      await tx.processedReference.create({
        data: {
          reference_code: event.reference_code,
          source: event.source,
        },
      });
    });

    return { status: 'ACK', reference_code: event.reference_code };
  }

  async confirmMint(reference_code: string, tx_hash: string): Promise<void> {
    const pending = await this.db.pendingMint.findUnique({
      where: { reference_code },
    });
    if (!pending) {
      throw new Error(`PendingMint not found for reference_code: ${reference_code}`);
    }

    await this.db.$transaction(async (tx: TxClient) => {
      await tx.pendingMint.update({
        where: { reference_code },
        data: { status: 'MINTED', tx_hash, resolved_at: new Date() },
      });

      if (pending.transaction_id) {
        await tx.transaction.update({
          where: { id: pending.transaction_id },
          data: { status: 'CONFIRMED', tx_hash, confirmed_at: new Date() },
        });
      }

      // Update wallet balance (only exists for user wallets, not merchant wallets)
      const wallet = await tx.wallet.findUnique({ where: { address: pending.client_wallet } });
      if (wallet) {
        await tx.wallet.update({
          where: { address: pending.client_wallet },
          data: { catr_balance: { increment: pending.amount_lempiras } },
        });
      }
    });

    // Reward evaluation after successful mint
    if (this.rewardService && pending.transaction_id) {
      const txRecord = await this.db.transaction.findUnique({
        where: { id: pending.transaction_id },
      });
      if (txRecord) {
        await this.rewardService.evaluateAfterMint(txRecord.user_id);
      }
    }
  }
}
