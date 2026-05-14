import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { mintGca } from './gca_chain';

const GCA_GIFT_DEFAULT  = new Decimal('1200');
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
  await db.merchantGcaAllocation.create({
    data: { merchant_id: merchantId, gca_balance: 0, milestones_claimed: 0, gift_claimed: false },
  });
}

export async function approveGcaGift(db: PrismaClient, merchantId: string, amountGca?: number): Promise<string | null> {
  const allocation = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchantId } });
  if (!allocation) throw new Error('No GCA allocation found for merchant');
  if (allocation.gift_claimed) throw new Error('Welcome gift already claimed');

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant?.wallet_address) throw new Error('Merchant has no wallet address — cannot mint on-chain');

  const giftAmount = amountGca ? new Decimal(amountGca) : GCA_GIFT_DEFAULT;
  if (giftAmount.lte(0)) throw new Error('Gift amount must be positive');

  // DB-first: mark claimed before hitting the chain (prevents double-gift on retry)
  let gcaTxId: string;
  await db.$transaction(async (tx) => {
    await tx.merchantGcaAllocation.update({
      where: { merchant_id: merchantId },
      data: { gca_balance: { increment: giftAmount }, gift_claimed: true },
    });
    const gcaTx = await tx.gcaTransaction.create({
      data: {
        allocation_id: allocation.id,
        merchant_id: merchantId,
        type: 'GIFT',
        amount_gca: giftAmount,
        notes: `Welcome gift of ${giftAmount.toFixed(0)} GCA approved by admin — awaiting on-chain confirmation`,
      },
    });
    gcaTxId = gcaTx.id;
  });

  const txHash = await mintGca(merchant.wallet_address, giftAmount.toNumber());
  console.log(`[GCA] GIFT  merchant=${merchant.name} amount=${giftAmount.toFixed(0)} GCA  tx=${txHash}`);
  await db.gcaTransaction.update({
    where: { id: gcaTxId! },
    data: { notes: `Welcome gift — ${giftAmount.toFixed(0)} GCA minted on-chain | tx: ${txHash}` },
  });

  return txHash;
}

export async function evaluateGcaVesting(db: PrismaClient, merchantId: string): Promise<void> {
  const allocation = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchantId } });
  if (!allocation || allocation.milestones_claimed >= MAX_MILESTONES) return;

  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant?.wallet_address) throw new Error('Merchant has no wallet address — cannot mint GCA on-chain');

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

  // DB-first: record vesting before hitting the chain
  let gcaTxId: string;
  await db.$transaction(async (tx) => {
    await tx.merchantGcaAllocation.update({
      where: { merchant_id: merchantId },
      data: {
        gca_balance:             { increment: gcaEarned },
        lifetime_effective_catr: effectiveCatr,
        milestones_claimed:      newMilestonesTotal,
      },
    });
    const gcaTx = await tx.gcaTransaction.create({
      data: {
        allocation_id: allocation.id,
        merchant_id: merchantId,
        type: 'VEST',
        amount_gca: gcaEarned,
        notes: `Milestone ${allocation.milestones_claimed + 1}–${newMilestonesTotal}: ${effectiveCatr.toFixed(2)} effective CATR (×${multiplier} multiplier, ${(ratio * 100).toFixed(0)}% unique clients) — awaiting on-chain mint`,
      },
    });
    gcaTxId = gcaTx.id;
  });

  const txHash = await mintGca(merchant.wallet_address, gcaEarned.toNumber());
  console.log(`[GCA] VEST  merchant=${merchant.name} milestones=${allocation.milestones_claimed + 1}–${newMilestonesTotal} amount=${gcaEarned.toFixed(0)} GCA  tx=${txHash}`);
  await db.gcaTransaction.update({
    where: { id: gcaTxId! },
    data: { notes: `Milestone ${allocation.milestones_claimed + 1}–${newMilestonesTotal}: ${effectiveCatr.toFixed(2)} effective CATR (×${multiplier} multiplier, ${(ratio * 100).toFixed(0)}% unique clients) | vest tx: ${txHash}` },
  });
}

export async function currentPriceFloor(db: PrismaClient): Promise<Decimal> {
  const [reserve, circulatingAgg, manualFloor] = await Promise.all([
    db.gcaReserve.findUnique({ where: { id: 'gca-reserve-singleton' } }),
    db.merchantGcaAllocation.aggregate({ _sum: { gca_balance: true } }),
    db.gcaPriceFloor.findFirst({ where: { active: true }, orderBy: { set_at: 'desc' } }),
  ]);

  const minimum = manualFloor ? new Decimal(manualFloor.price_hnl) : new Decimal('1');
  const circulating = new Decimal(circulatingAgg._sum.gca_balance ?? 0);
  if (circulating.lte(0) || !reserve) return minimum;

  const dynamic = new Decimal(reserve.balance_hnl).div(circulating);
  return dynamic.gt(minimum) ? dynamic : minimum;
}

export async function gcaReserveStatus(db: PrismaClient): Promise<{
  balance_hnl: string;
  circulating_gca: string;
  price_floor_hnl: string;
}> {
  const [floor, reserve, circulatingAgg] = await Promise.all([
    currentPriceFloor(db),
    db.gcaReserve.findUnique({ where: { id: 'gca-reserve-singleton' } }),
    db.merchantGcaAllocation.aggregate({ _sum: { gca_balance: true } }),
  ]);
  return {
    balance_hnl:     new Decimal(reserve?.balance_hnl ?? 0).toFixed(4),
    circulating_gca: new Decimal(circulatingAgg._sum.gca_balance ?? 0).toFixed(4),
    price_floor_hnl: floor.toFixed(4),
  };
}
