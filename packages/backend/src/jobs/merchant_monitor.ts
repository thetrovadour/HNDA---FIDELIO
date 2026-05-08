import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { deactivateMerchant } from '../services/merchant_activation_service';

export class MerchantMonitorJob {
  constructor(private db: PrismaClient) {}

  async run(): Promise<{ inactivity: number; failed_redemptions: number }> {
    const result = { inactivity: 0, failed_redemptions: 0 };

    // 1. Inactivity: ACTIVE merchants with no transactions in last 90 days
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const activeMerchants = await this.db.merchant.findMany({
      where: { merchant_status: 'ACTIVE' },
      select: { id: true },
    });

    for (const { id } of activeMerchants) {
      const recentTx = await this.db.transaction.findFirst({
        where: { merchant_id: id, created_at: { gte: cutoff } },
        select: { id: true },
      });

      if (!recentTx) {
        await deactivateMerchant(this.db, id, 'No transactions in 90 days', 'system');
        result.inactivity++;
        continue;
      }

      // 2. 5 consecutive failed redemptions
      const lastFive = await this.db.redemptionRequest.findMany({
        where: { merchant_id: id },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { status: true },
      });

      if (lastFive.length === 5 && lastFive.every((r) => r.status === 'FAILED')) {
        await deactivateMerchant(this.db, id, '5 consecutive failed redemptions', 'system');
        result.failed_redemptions++;
      }
    }

    return result;
  }

  schedule(): void {
    // Run daily at 09:00 UTC
    cron.schedule('0 9 * * *', async () => {
      console.log('[MerchantMonitorJob] Running daily merchant monitor...');
      try {
        const result = await this.run();
        console.log('[MerchantMonitorJob] Result:', result);
      } catch (err) {
        console.error('[MerchantMonitorJob] Error:', err);
      }
    });
  }
}
