import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate';
import db from '../db';

const PilotLoginSchema = z.object({
  full_name: z.string().min(1),
  pin: z.string().length(4),
});

export function authRouter(): Router {
  const router = Router();

  router.post('/pilot-login', validate(PilotLoginSchema), async (req: Request, res: Response) => {
    const { full_name, pin } = req.body as { full_name: string; pin: string };

    const user = await db.user.findFirst({
      where: { full_name, pin },
      include: { wallet: true },
    });

    if (!user) {
      res.status(401).json({ error: 'No encontramos tu cuenta', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Auth not configured', code: 'JWT_NOT_CONFIGURED' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: 'user' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    const [transactions, milestones, merchants] = await Promise.all([
      db.transaction.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      db.rewardMilestone.findMany({
        where: { user_id: user.id },
      }),
      db.merchant.findMany({ where: { active: true } }),
    ]);

    res.status(200).json({
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          catr_balance: user.wallet?.catr_balance?.toString() ?? '0',
          wallet_address: user.wallet?.address,
          created_at: user.created_at,
        },
        transactions: transactions.map((tx) => ({
          id: tx.id,
          amount_catr: tx.amount_catr.toString(),
          type: tx.type,
          created_at: tx.created_at,
          merchant_id: tx.merchant_id ?? undefined,
        })),
        milestones: milestones.map((m) => ({
          id: m.id,
          type: m.type,
          unlocked_at: m.triggered_at,
        })),
        merchants: merchants.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          wallet_address: m.wallet_address,
          contact_email: m.contact_email,
          active: m.active,
        })),
      },
    });
  });

  return router;
}
