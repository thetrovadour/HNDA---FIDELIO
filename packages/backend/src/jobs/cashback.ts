import cron from 'node-cron';
import { RewardService } from '../services/reward_service';

export class CashbackJob {
  constructor(private rewardService: RewardService) {}

  async run(): Promise<{ processed: number; payouts: number }> {
    return this.rewardService.processCashbackBatch();
  }

  schedule(): void {
    cron.schedule('0 */12 * * *', async () => {
      console.log('[CashbackJob] Processing cashback batch...');
      try {
        const result = await this.run();
        console.log('[CashbackJob] Result:', result);
      } catch (err) {
        console.error('[CashbackJob] Error:', err);
      }
    });
  }
}
