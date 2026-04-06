import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { TransactionService } from '../services/transaction_service';
import db from '../db';

const SpendSchema = z.object({
  user_id: z.string().uuid(),
  merchant_id: z.string().uuid(),
  amount_catr: z.string().min(1),
});

export function transactionsRouter(transactionService: TransactionService): Router {
  const router = Router();

  router.get('/:id', async (req: Request, res: Response) => {
    const tx = await db.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: tx });
  });

  router.post('/spend', validate(SpendSchema), async (req: Request, res: Response) => {
    try {
      const tx = await transactionService.recordSpend(req.body);
      res.status(201).json({ data: tx });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
