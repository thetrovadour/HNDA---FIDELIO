import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminAuth } from '../middleware/auth';
import db from '../db';

const CreateMerchantSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  wallet_address: z.string().min(1),
  contact_email: z.string().email(),
});

const UpdateMerchantSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  contact_email: z.string().email().optional(),
  active: z.boolean().optional(),
});

export function merchantsRouter(): Router {
  const router = Router();

  router.get('/', adminAuth, async (_req: Request, res: Response) => {
    const merchants = await db.merchant.findMany();
    res.status(200).json({ data: merchants });
  });

  router.get('/:id', adminAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: merchant });
  });

  router.post('/', adminAuth, validate(CreateMerchantSchema), async (req: Request, res: Response) => {
    try {
      const merchant = await db.merchant.create({ data: req.body });
      res.status(201).json({ data: merchant });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.patch('/:id', adminAuth, validate(UpdateMerchantSchema), async (req: Request, res: Response) => {
    try {
      const merchant = await db.merchant.update({ where: { id: req.params.id }, data: req.body });
      res.status(200).json({ data: merchant });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
