import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminAuth } from '../middleware/auth';
import { RedemptionService } from '../services/redemption_service';

const CreateRedemptionSchema = z.object({
  merchant_id: z.string().uuid(),
  amount_catr: z.string().min(1),
});

export function redemptionsRouter(redemptionService: RedemptionService): Router {
  const router = Router();

  router.post('/', adminAuth, validate(CreateRedemptionSchema), async (req: Request, res: Response) => {
    try {
      const result = await redemptionService.createRequest(req.body.merchant_id, req.body.amount_catr);
      res.status(201).json({ data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.get('/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const { db } = redemptionService as any;
      const request = await db.redemptionRequest.findUnique({ where: { id: req.params.id } });
      if (!request) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json({ data: request });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.get('/', adminAuth, async (req: Request, res: Response) => {
    try {
      const { db } = redemptionService as any;
      const where: any = {};
      if (req.query.status) where.status = req.query.status;
      if (req.query.tier) where.tier = req.query.tier;
      const results = await db.redemptionRequest.findMany({ where });
      res.status(200).json({ data: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
    }
  });

  router.patch('/:id/approve', adminAuth, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).admin;
      const result = await redemptionService.approveRequest(req.params.id, admin?.sub ?? 'admin');
      res.status(200).json({ data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.patch('/:id/reject', adminAuth, async (req: Request, res: Response) => {
    try {
      const { db } = redemptionService as any;
      await db.redemptionRequest.update({
        where: { id: req.params.id },
        data: { status: 'FAILED' },
      });
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
