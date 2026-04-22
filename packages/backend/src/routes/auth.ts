import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validate } from '../middleware/validate';
import db from '../db';

const RegisterSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('client'),
    full_name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  }),
  z.object({
    role: z.literal('merchant'),
    full_name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    business_name: z.string().min(1),
    category: z.string().min(1),
  }),
]);

const PilotLoginSchema = z.object({
  full_name: z.string().min(1),
  credential: z.string().min(1),
});

const SetPasswordSchema = z.object({
  user_id: z.string().min(1),
  current_credential: z.string().min(1),
  new_password: z.string().min(6),
});

export function authRouter(): Router {
  const router = Router();

  router.post('/pilot-login', validate(PilotLoginSchema), async (req: Request, res: Response) => {
    const { full_name, credential } = req.body as { full_name: string; credential: string };

    const user = await db.user.findFirst({
      where: { full_name },
      include: { wallet: true },
    });

    if (!user) {
      res.status(401).json({ error: 'No encontramos tu cuenta', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const valid = user.password_hash
      ? await bcrypt.compare(credential, user.password_hash)
      : user.pin === credential;

    if (!valid) {
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

  router.post('/set-password', validate(SetPasswordSchema), async (req: Request, res: Response) => {
    const { user_id, current_credential, new_password } = req.body as {
      user_id: string; current_credential: string; new_password: string;
    };

    const user = await db.user.findUnique({ where: { id: user_id } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado', code: 'NOT_FOUND' });
      return;
    }

    const valid = user.password_hash
      ? await bcrypt.compare(current_credential, user.password_hash)
      : user.pin === current_credential;

    if (!valid) {
      res.status(401).json({ error: 'Credencial actual incorrecta', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.user.update({ where: { id: user_id }, data: { password_hash } });
    res.status(200).json({ data: { ok: true } });
  });

  router.post('/register', validate(RegisterSchema), async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof RegisterSchema>;

    const existing = await db.user.findFirst({ where: { email: body.email } });
    if (existing) {
      res.status(409).json({ error: 'Este correo ya está registrado', code: 'EMAIL_TAKEN' });
      return;
    }

    const password_hash = await bcrypt.hash(body.password, 10);

    if (body.role === 'client') {
      const user = await db.user.create({
        data: { full_name: body.full_name, email: body.email, password_hash },
      });
      res.status(201).json({ data: { role: 'client', user_id: user.id } });
      return;
    }

    // merchant: create owner user + pending merchant record (active: false, no wallet yet)
    const user = await db.user.create({
      data: { full_name: body.full_name, email: body.email, password_hash },
    });
    await db.merchant.create({
      data: {
        name: body.business_name,
        category: body.category,
        contact_email: body.email,
        active: false,
        owner_user_id: user.id,
      },
    });
    res.status(201).json({ data: { role: 'merchant', user_id: user.id } });
  });

  return router;
}
