import { Router, Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth';

const RESERVE_FLOOR = new Decimal('0.15'); // 15% minimum pool reserve
const POOL_SHARE    = new Decimal('0.35'); // 35% of commission goes to reward pool

async function estimatedPoolBalance(db: PrismaClient): Promise<Decimal> {
  const [inflowAgg, paidAgg] = await Promise.all([
    db.transaction.aggregate({
      where: { type: 'SPEND', status: 'CONFIRMED' },
      _sum: { commission_catr: true },
    }),
    db.rewardPayoutQueue.aggregate({
      where: { status: 'PAID' },
      _sum: { amount_catr: true },
    }),
  ]);

  const totalInflow = new Decimal(inflowAgg._sum.commission_catr ?? 0).mul(POOL_SHARE);
  const totalPaid   = new Decimal(paidAgg._sum.amount_catr ?? 0);
  return totalInflow.minus(totalPaid);
}

export function rewardsRouter(db: PrismaClient): Router {
  const router = Router();

  router.get('/queue', adminAuth, async (_req: Request, res: Response) => {
    const queue = await db.rewardPayoutQueue.findMany();
    res.status(200).json({ data: queue });
  });

  router.get('/:user_id', adminAuth, async (req: Request, res: Response) => {
    const milestones = await db.rewardMilestone.findMany({
      where: { user_id: req.params.user_id as string },
    });
    res.status(200).json({ data: milestones });
  });

  router.patch('/queue/:id/approve', adminAuth, async (req: Request, res: Response) => {
    try {
      const entry = await db.rewardPayoutQueue.findUnique({ where: { id: req.params.id as string } });
      if (!entry) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }

      // Pool solvency gate: ensure payout does not breach the 15% reserve floor
      const poolBalance  = await estimatedPoolBalance(db);
      const payoutAmount = new Decimal(entry.amount_catr);
      const balanceAfter = poolBalance.minus(payoutAmount);

      if (balanceAfter.lt(poolBalance.mul(RESERVE_FLOOR))) {
        const deferred = await db.rewardPayoutQueue.update({
          where: { id: req.params.id as string },
          data: { status: 'DEFERRED' },
        });
        res.status(402).json({
          error: 'Pool solvency check failed — payout deferred until pool is replenished',
          code: 'POOL_INSUFFICIENT',
          pool_balance: poolBalance.toFixed(4),
          payout_amount: payoutAmount.toFixed(4),
          data: deferred,
        });
        return;
      }

      const updated = await db.rewardPayoutQueue.update({
        where: { id: req.params.id as string },
        data: { status: 'PAID', approved_by: (req as any).admin?.sub ?? 'admin' },
      });
      res.status(200).json({ data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
