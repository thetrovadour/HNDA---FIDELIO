import cron from 'node-cron';
import { RewardService } from '../services/reward_service';

export class GoldCashbackJob {
  constructor(private rewardService: RewardService) {}

  async run(): Promise<{ processed: number; payouts: number }> {
    return this.rewardService.processGoldCashbackBatch();
  }

  schedule(): void {
    cron.schedule('0 * * * *', async () => {
      console.log('[GoldCashbackJob] Processing GOLD cashback batch...');
      try {
        const result = await this.run();
        if (result.processed > 0) console.log('[GoldCashbackJob] Result:', result);
      } catch (err) {
        console.error('[GoldCashbackJob] Error:', err);
      }
    });
  }
}
