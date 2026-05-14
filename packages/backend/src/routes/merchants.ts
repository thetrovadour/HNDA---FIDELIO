import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { validate } from '../middleware/validate';
import { adminAuth, merchantAuth } from '../middleware/auth';
import db from '../db';
import { initGcaAllocation } from '../services/gca_service';
import { RedemptionService } from '../services/redemption_service';
import { checkAndActivate, deactivateMerchant } from '../services/merchant_activation_service';

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
});

const MerchantRedemptionSchema = z.object({
  amount_catr: z.string().min(1),
});

const DeactivateMerchantSchema = z.object({
  reason: z.string().min(1),
});

export function merchantsRouter(redemptionService: RedemptionService): Router {
  const router = Router();

  // ── Public merchant-facing routes (no auth) ──────────────────────────────────

  router.get('/active', async (_req: Request, res: Response) => {
    const merchants = await db.merchant.findMany({
      where: { merchant_status: 'ACTIVE' },
      select: { id: true, name: true, category: true, merchant_status: true },
    });
    res.status(200).json({ data: merchants });
  });

  router.get('/:id/public', async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: merchant });
  });

  router.get('/:id/balance', merchantAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }

    const [received, minted, redeemed] = await Promise.all([
      db.transaction.aggregate({
        where: { merchant_id: req.params.id as string, type: 'SPEND', status: 'CONFIRMED' },
        _sum: { amount_catr: true },
      }),
      merchant.wallet_address
        ? db.pendingMint.aggregate({
            where: { client_wallet: merchant.wallet_address, status: 'MINTED' },
            _sum: { amount_lempiras: true },
          })
        : Promise.resolve({ _sum: { amount_lempiras: null } }),
      db.redemptionRequest.aggregate({
        where: { merchant_id: req.params.id as string, status: { in: ['BURNED', 'LEMPIRAS_SENT'] } },
        _sum: { amount_catr: true },
      }),
    ]);

    const totalReceived = Number(received._sum?.amount_catr ?? 0);
    const totalMinted   = Number(minted._sum?.amount_lempiras ?? 0);
    const totalRedeemed = Number(redeemed._sum?.amount_catr ?? 0);
    const balance = totalReceived + totalMinted - totalRedeemed;

    res.status(200).json({
      data: {
        catr_balance:    balance.toFixed(2),
        total_received:  (totalReceived + totalMinted).toFixed(2),
        total_redeemed:  totalRedeemed.toFixed(2),
      },
    });
  });

  router.get('/:id/transactions', merchantAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }

    const [transactions, mints] = await Promise.all([
      db.transaction.findMany({
        where: { merchant_id: req.params.id as string, status: 'CONFIRMED' },
        orderBy: { created_at: 'desc' },
        take: 100,
        include: { user: { select: { full_name: true } } },
      }),
      merchant.wallet_address
        ? db.pendingMint.findMany({
            where: { client_wallet: merchant.wallet_address, status: 'MINTED' },
            orderBy: { resolved_at: 'desc' },
            take: 100,
          })
        : Promise.resolve([]),
    ]);

    const mintEntries = mints.map((m) => ({
      id: m.id,
      user_id: null,
      sender_name: null,
      amount_catr: m.amount_lempiras.toString(),
      type: 'MINT',
      status: 'CONFIRMED',
      source: m.source,
      created_at: m.resolved_at ?? m.created_at,
    }));

    const txEntries = transactions.map(({ user, ...tx }) => ({
      ...tx,
      sender_name: user?.full_name ?? null,
    }));

    const all = [...txEntries, ...mintEntries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 100);

    res.status(200).json({ data: all });
  });

  router.get('/:id/redemptions', merchantAuth, async (req: Request, res: Response) => {
    const redemptions = await db.redemptionRequest.findMany({
      where: { merchant_id: req.params.id as string },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ data: redemptions });
  });

  router.post('/:id/redemptions', merchantAuth, validate(MerchantRedemptionSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    if (merchant.merchant_status !== 'ACTIVE') {
      res.status(403).json({ error: 'Merchant account is not active', code: 'MERCHANT_NOT_ACTIVE' });
      return;
    }
    try {
      const result = await redemptionService.createRequest(req.params.id as string, req.body.amount_catr);
      res.status(201).json({ data: result });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  // ── Merchant status ────────────────────────────────────────────────────────

  router.get('/:id/status', merchantAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({
      where: { id: req.params.id as string },
      select: { merchant_status: true, deactivation_reason: true, activation_checklist: true },
    });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: merchant });
  });

  // ── Merchant self-service profile update ────────────────────────────────────

  const UpdateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    contact_email: z.string().email().optional(),
  });

  router.patch('/:id/profile', merchantAuth, validate(UpdateProfileSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    try {
      const updated = await db.merchant.update({ where: { id: req.params.id as string }, data: req.body });
      await checkAndActivate(db, req.params.id as string);
      res.status(200).json({ data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  // ── Merchant self-service notifications ────────────────────────────────────

  const UpdateMerchantNotificationsSchema = z.object({
    notify_redemption_update: z.boolean().optional(),
  });

  router.patch('/:id/notifications', merchantAuth, validate(UpdateMerchantNotificationsSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    const updated = await db.merchant.update({ where: { id: req.params.id as string }, data: req.body });
    res.status(200).json({ data: { notify_redemption_update: updated.notify_redemption_update } });
  });

  // ── Merchant self-service payout preferences ────────────────────────────────

  const UpdateMerchantPayoutSchema = z.object({
    payout_bank:           z.string().optional(),
    payout_account_number: z.string().optional(),
    payout_account_type:   z.enum(['SAVINGS', 'CHECKING']).optional(),
    payout_crypto_address: z.string().optional(),
  });

  router.patch('/:id/payout', merchantAuth, validate(UpdateMerchantPayoutSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    try {
      const updated = await db.merchant.update({ where: { id: req.params.id as string }, data: req.body });
      res.status(200).json({ data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  // ── Merchant self-service password change ──────────────────────────────────

  const ChangePasswordSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(6),
  });

  router.patch('/:id/password', merchantAuth, validate(ChangePasswordSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant || !merchant.owner_user_id) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    const user = await db.user.findUnique({ where: { id: merchant.owner_user_id } });
    if (!user || !user.password_hash) {
      res.status(400).json({ error: 'No password set for this account', code: 'NO_PASSWORD' });
      return;
    }
    const valid = await bcrypt.compare(req.body.current_password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Contraseña actual incorrecta', code: 'INVALID_PASSWORD' });
      return;
    }
    const password_hash = await bcrypt.hash(req.body.new_password, 10);
    await db.user.update({ where: { id: merchant.owner_user_id }, data: { password_hash } });
    res.status(200).json({ data: { ok: true } });
  });

  // ── Admin routes ─────────────────────────────────────────────────────────────

  router.get('/', adminAuth, async (_req: Request, res: Response) => {
    const merchants = await db.merchant.findMany();
    res.status(200).json({ data: merchants });
  });

  router.get('/:id', adminAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: merchant });
  });

  router.post('/', adminAuth, validate(CreateMerchantSchema), async (req: Request, res: Response) => {
    try {
      const merchant = await db.merchant.create({ data: req.body });
      await initGcaAllocation(db, merchant.id);
      await checkAndActivate(db, merchant.id);
      res.status(201).json({ data: merchant });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.patch('/:id', adminAuth, validate(UpdateMerchantSchema), async (req: Request, res: Response) => {
    try {
      const merchant = await db.merchant.update({ where: { id: req.params.id as string }, data: req.body });
      await checkAndActivate(db, req.params.id as string);
      res.status(200).json({ data: merchant });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.patch('/:id/activate', adminAuth, async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    await db.merchant.update({
      where: { id: req.params.id as string },
      data: {
        merchant_status: 'ACTIVE',
        deactivation_reason: null,
        deactivated_at: null,
        deactivated_by: null,
        reactivated_at: merchant.merchant_status === 'DEACTIVATED' ? new Date() : undefined,
      },
    });
    res.status(200).json({ data: { ok: true } });
  });

  router.patch('/:id/deactivate', adminAuth, validate(DeactivateMerchantSchema), async (req: Request, res: Response) => {
    const merchant = await db.merchant.findUnique({ where: { id: req.params.id as string } });
    if (!merchant) {
      res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
      return;
    }
    try {
      const adminPayload = req.admin as { sub?: string } | undefined;
      const triggeredBy = adminPayload?.sub ?? 'admin';
      await deactivateMerchant(db, req.params.id as string, req.body.reason, triggeredBy);
      res.status(200).json({ data: { success: true } });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
