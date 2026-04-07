import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/auth';
import db from '../db';

export function rewardsRouter(): Router {
  const router = Router();

  router.get('/queue', adminAuth, async (_req: Request, res: Response) => {
    const queue = await db.rewardPayoutQueue.findMany();
    res.status(200).json({ data: queue });
  });

  router.get('/:user_id', adminAuth, async (req: Request, res: Response) => {
    const milestones = await db.rewardMilestone.findMany({
      where: { user_id: req.params.user_id },
    });
    res.status(200).json({ data: milestones });
  });

  router.patch('/queue/:id/approve', adminAuth, async (req: Request, res: Response) => {
    try {
      const entry = await db.rewardPayoutQueue.findUnique({ where: { id: req.params.id } });
      if (!entry) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }
      const updated = await db.rewardPayoutQueue.update({
        where: { id: req.params.id },
        data: { status: 'PAID', approved_by: (req as any).admin?.sub ?? 'admin' },
      });
      res.status(200).json({ data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
