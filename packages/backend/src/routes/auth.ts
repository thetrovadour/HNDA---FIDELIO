import { Router, Request, Response, CookieOptions } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validate } from '../middleware/validate';
import db from '../db';
import { generateWallet } from '../utils/wallet_crypto';

const RegisterSchema = z.object({
  role: z.literal('client'),
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const PilotLoginSchema = z.object({
  full_name: z.string().min(1),
  credential: z.string().min(1),
});

const MerchantLoginSchema = z.object({
  full_name: z.string().min(1),
  credential: z.string().min(1),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  new_password: z.string().min(6),
});

const SetPasswordSchema = z.object({
  user_id: z.string().min(1),
  current_credential: z.string().min(1),
  new_password: z.string().min(6),
});

const isProd = process.env.NODE_ENV === 'production';

const TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'strict' : 'lax',
  secure: isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

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
      db.merchant.findMany({ where: { merchant_status: 'ACTIVE' } }),
    ]);

    res.cookie('fidelio_token', token, TOKEN_COOKIE);
    res.status(200).json({
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          catr_balance: user.wallet?.catr_balance?.toString() ?? '0',
          wallet_address: user.wallet?.address,
          created_at: user.created_at,
          notify_points_received: user.notify_points_received,
          notify_milestone_near:  user.notify_milestone_near,
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
          merchant_status: m.merchant_status,
        })),
      },
    });
  });

  router.post('/merchant-login', validate(MerchantLoginSchema), async (req: Request, res: Response) => {
    const { full_name, credential } = req.body as { full_name: string; credential: string };

    const user = await db.user.findFirst({ where: { full_name } });
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

    const merchant = await db.merchant.findFirst({ where: { owner_user_id: user.id } });
    if (!merchant) {
      res.status(403).json({ error: 'Esta cuenta no tiene un negocio asociado', code: 'NOT_A_MERCHANT' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Auth not configured', code: 'JWT_NOT_CONFIGURED' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, user_id: user.id, merchant_id: merchant.id, role: 'merchant' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    res.cookie('fidelio_token', token, TOKEN_COOKIE);
    res.status(200).json({
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          category: merchant.category,
          contact_email: merchant.contact_email,
          wallet_address: merchant.wallet_address,
          merchant_status: merchant.merchant_status,
          notify_redemption_update: merchant.notify_redemption_update,
          payout_bank: merchant.payout_bank,
          payout_account_number: merchant.payout_account_number,
          payout_account_type: merchant.payout_account_type,
          payout_crypto_address: merchant.payout_crypto_address,
        },
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

  router.post('/forgot-password', validate(ForgotPasswordSchema), async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const user = await db.user.findUnique({ where: { email } });
    // Always return ok — never reveal if email exists
    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.user.update({
        where: { id: user.id },
        data: { reset_code: code, reset_code_expires_at: expires },
      });
    }
    res.status(200).json({ data: { ok: true } });
  });

  router.post('/reset-password', validate(ResetPasswordSchema), async (req: Request, res: Response) => {
    const { email, code, new_password } = req.body as { email: string; code: string; new_password: string };
    const user = await db.user.findUnique({ where: { email } });
    if (
      !user ||
      user.reset_code !== code ||
      !user.reset_code_expires_at ||
      user.reset_code_expires_at < new Date()
    ) {
      res.status(400).json({ error: 'Código inválido o expirado', code: 'INVALID_RESET_CODE' });
      return;
    }
    const password_hash = await bcrypt.hash(new_password, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password_hash, reset_code: null, reset_code_expires_at: null },
    });
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

    const user = await db.user.create({
      data: { full_name: body.full_name, email: body.email, password_hash },
    });
    const { address, privateKeyEncrypted } = generateWallet();
    await db.wallet.create({ data: { user_id: user.id, address, private_key_encrypted: privateKeyEncrypted } });
    res.status(201).json({ data: { role: 'client', user_id: user.id, wallet_address: address } });
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('fidelio_token', { path: '/' });
    res.status(200).json({ data: { ok: true } });
  });

  return router;
}
