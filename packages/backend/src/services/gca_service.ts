import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

const GCA_GIFT          = new Decimal('200');
const GCA_PER_MILESTONE = new Decimal('100');
const CATR_PER_MILESTONE = new Decimal('25000');
const MAX_MILESTONES    = 10;

function uniqueClientMultiplier(ratio: number): Decimal {
  if (ratio >= 0.6) return new Decimal('2.0');
  if (ratio >= 0.4) return new Decimal('1.5');
  if (ratio >= 0.2) return new Decimal('1.25');
  return new Decimal('1.0');
}

export async function initGcaAllocation(db: PrismaClient, merchantId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const allocation = await tx.merchantGcaAllocation.create({
      data: { merchant_id: merchantId, gca_balance: GCA_GIFT, milestones_claimed: 0 },
    });
    await tx.gcaTransaction.create({
      data: {
        allocation_id: allocation.id,
        merchant_id: merchantId,
        type: 'GIFT',
        amount_gca: GCA_GIFT,
        notes: 'Welcome gift on joining FIDELIO network',
      },
    });
  });
}

export async function evaluateGcaVesting(db: PrismaClient, merchantId: string): Promise<void> {
  const allocation = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchantId } });
  if (!allocation || allocation.milestones_claimed >= MAX_MILESTONES) return;

  // Compute total CATR processed by this merchant
  const volumeAgg = await db.transaction.aggregate({
    where: { merchant_id: merchantId, type: 'SPEND', status: 'CONFIRMED' },
    _sum: { amount_catr: true },
    _count: { id: true },
  });

  const totalCatr     = new Decimal(volumeAgg._sum.amount_catr ?? 0);
  const totalTxns     = volumeAgg._count.id;

  // Count unique clients in the same window
  const uniqueClients = await db.transaction.groupBy({
    by: ['user_id'],
    where: { merchant_id: merchantId, type: 'SPEND', status: 'CONFIRMED' },
  });

  const ratio          = totalTxns > 0 ? uniqueClients.length / totalTxns : 0;
  const multiplier     = uniqueClientMultiplier(ratio);
  const effectiveCatr  = totalCatr.mul(multiplier);

  const newMilestonesTotal = Math.min(
    Math.floor(effectiveCatr.div(CATR_PER_MILESTONE).toNumber()),
    MAX_MILESTONES
  );
  const newMilestones = newMilestonesTotal - allocation.milestones_claimed;
  if (newMilestones <= 0) return;

  const gcaEarned = GCA_PER_MILESTONE.mul(newMilestones);

  await db.$transaction(async (tx) => {
    await tx.merchantGcaAllocation.update({
      where: { merchant_id: merchantId },
      data: {
        gca_balance:             { increment: gcaEarned },
        lifetime_effective_catr: effectiveCatr,
        milestones_claimed:      newMilestonesTotal,
      },
    });
    await tx.gcaTransaction.create({
      data: {
        allocation_id: allocation.id,
        merchant_id: merchantId,
        type: 'VEST',
        amount_gca: gcaEarned,
        notes: `Milestone ${allocation.milestones_claimed + 1}–${newMilestonesTotal}: ${effectiveCatr.toFixed(2)} effective CATR (×${multiplier} multiplier, ${(ratio * 100).toFixed(0)}% unique clients)`,
      },
    });
  });
}

export async function currentPriceFloor(db: PrismaClient): Promise<Decimal> {
  const floor = await db.gcaPriceFloor.findFirst({ where: { active: true }, orderBy: { set_at: 'desc' } });
  return floor ? new Decimal(floor.price_hnl) : new Decimal('1');
}
