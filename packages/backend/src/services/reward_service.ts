import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class RewardService {
  constructor(private db: PrismaClient) {}

  async evaluateAfterMint(user_id: string): Promise<void> {
    await this.checkMilestones(user_id);
    await this.checkReferralTrigger(user_id);
  }

  async evaluateAfterSpend(user_id: string): Promise<void> {
    await this.checkMilestones(user_id);
    await this.checkCrossMerchantBonus(user_id);
  }

  async checkMilestones(user_id: string): Promise<void> {
    const count = await this.db.transaction.count({
      where: { user_id, type: 'MINT', status: 'CONFIRMED' },
    });

    const milestones: Array<{ type: 'TX_5' | 'TX_10' | 'TX_25'; threshold: number; amount: string }> = [
      { type: 'TX_5', threshold: 5, amount: '5' },
      { type: 'TX_10', threshold: 10, amount: '10' },
      { type: 'TX_25', threshold: 25, amount: '25' },
    ];

    for (const m of milestones) {
      if (count >= m.threshold) {
        const existing = await this.db.rewardMilestone.findUnique({
          where: { user_id_type: { user_id, type: m.type } },
        });
        if (!existing) {
          const wallet = await this.db.wallet.findUnique({ where: { user_id } });
          if (wallet) {
            const milestone = await this.db.rewardMilestone.create({
              data: {
                user_id,
                type: m.type,
                amount_catr: new Decimal(m.amount),
              },
            });
            await this.queuePayout({
              recipient_wallet: wallet.address,
              amount_catr: m.amount,
              source_type: 'MILESTONE',
              source_id: milestone.id,
            });
          }
        }
      }
    }
  }

  async checkCrossMerchantBonus(user_id: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const visits = await this.db.merchantVisit.groupBy({
      by: ['merchant_id'],
      where: { user_id, visited_at: { gte: thirtyDaysAgo } },
    });

    if (visits.length >= 3) {
      const existing = await this.db.rewardMilestone.findUnique({
        where: { user_id_type: { user_id, type: 'CROSS_MERCHANT' } },
      });
      if (!existing) {
        const wallet = await this.db.wallet.findUnique({ where: { user_id } });
        if (wallet) {
          const milestone = await this.db.rewardMilestone.create({
            data: {
              user_id,
              type: 'CROSS_MERCHANT',
              amount_catr: new Decimal('10'),
            },
          });
          await this.queuePayout({
            recipient_wallet: wallet.address,
            amount_catr: '10',
            source_type: 'CROSS_MERCHANT',
            source_id: milestone.id,
          });
        }
      }
    }
  }

  async checkReferralTrigger(user_id: string): Promise<void> {
    const referral = await this.db.referral.findFirst({
      where: { referred_id: user_id, status: 'PENDING' },
    });
    if (!referral) return;

    await this.db.referral.update({
      where: { id: referral.id },
      data: { status: 'TRIGGERED', triggered_at: new Date() },
    });

    const referrerWallet = await this.db.wallet.findUnique({
      where: { user_id: referral.referrer_id },
    });
    if (referrerWallet) {
      await this.queuePayout({
        recipient_wallet: referrerWallet.address,
        amount_catr: '5',
        source_type: 'REFERRAL',
        source_id: referral.id,
      });
    }
  }

  private async queuePayout(params: {
    recipient_wallet: string;
    amount_catr: string;
    source_type: string;
    source_id: string;
  }): Promise<void> {
    const amount = parseFloat(params.amount_catr);
    let tier: 'AUTO' | 'ADMIN_APPROVAL' | 'VAULT_OP';
    if (amount < 50) {
      tier = 'AUTO';
    } else if (amount <= 500) {
      tier = 'ADMIN_APPROVAL';
    } else {
      tier = 'VAULT_OP';
    }

    await this.db.rewardPayoutQueue.create({
      data: {
        recipient_wallet: params.recipient_wallet,
        amount_catr: new Decimal(params.amount_catr),
        tier,
        status: 'QUEUED',
        source_type: params.source_type,
        source_id: params.source_id,
      },
    });
  }
}
