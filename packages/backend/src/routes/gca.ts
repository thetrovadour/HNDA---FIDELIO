import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { currentPriceFloor, evaluateGcaVesting, approveGcaGift, gcaReserveStatus } from '../services/gca_service';
import { burnGca } from '../services/gca_chain';

const RedeemSchema = z.object({
  merchant_id: z.string().uuid(),
  amount_gca:  z.number().positive(),
});

const PriceFloorSchema = z.object({
  price_hnl: z.number().positive(),
});

export function gcaRouter(db: PrismaClient): Router {
  const router = Router();

  // GET /api/gca/:merchant_id — balance + HNL estimate
  router.get('/:merchant_id', async (req: Request, res: Response) => {
    const allocation = await db.merchantGcaAllocation.findUnique({
      where: { merchant_id: req.params.merchant_id as string },
    });
    if (!allocation) {
      res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
      return;
    }
    const priceFloor = await currentPriceFloor(db);
    const estimatedHnl = new Decimal(allocation.gca_balance).mul(priceFloor);

    res.status(200).json({
      data: {
        gca_balance:             allocation.gca_balance,
        milestones_claimed:      allocation.milestones_claimed,
        milestones_remaining:    10 - allocation.milestones_claimed,
        lifetime_effective_catr: allocation.lifetime_effective_catr,
        next_milestone_at:       new Decimal((allocation.milestones_claimed + 1) * 25000).toFixed(2),
        price_floor_hnl:         priceFloor.toFixed(4),
        estimated_hnl_value:     estimatedHnl.toFixed(2),
      },
    });
  });

  // GET /api/gca/:merchant_id/history — transaction log
  router.get('/:merchant_id/history', async (req: Request, res: Response) => {
    const history = await db.gcaTransaction.findMany({
      where: { merchant_id: req.params.merchant_id as string },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ data: history });
  });

  // POST /api/gca/redeem — submit redemption request (goes to admin queue)
  router.post('/redeem', validate(RedeemSchema), async (req: Request, res: Response) => {
    const { merchant_id, amount_gca } = req.body as z.infer<typeof RedeemSchema>;

    const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id } });
    if (!alloc) {
      res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
      return;
    }
    if (new Decimal(alloc.gca_balance).lt(amount_gca)) {
      res.status(400).json({ error: 'Insufficient GCA balance', code: 'INSUFFICIENT_GCA' });
      return;
    }

    const priceFloor   = await currentPriceFloor(db);
    const estimatedHnl = priceFloor.mul(amount_gca);

    const request = await db.gcaRedemptionRequest.create({
      data: {
        merchant_id,
        amount_gca,
        price_floor_hnl: priceFloor,
        amount_hnl_estimated: estimatedHnl,
      },
    });

    res.status(201).json({ data: request });
  });

  // POST /api/gca/apply — merchant submits GCA application
  router.post('/apply', async (req: Request, res: Response) => {
    const { merchant_id } = req.body as { merchant_id?: string };
    if (!merchant_id) {
      res.status(400).json({ error: 'merchant_id is required', code: 'MISSING_FIELD' });
      return;
    }
    const merchant = await db.merchant.findUnique({ where: { id: merchant_id } });
    if (!merchant || merchant.merchant_status !== 'ACTIVE') {
      res.status(404).json({ error: 'Merchant not found or not active', code: 'NOT_FOUND' });
      return;
    }
    const existing = await db.merchantGcaAllocation.findUnique({ where: { merchant_id } });
    if (existing) {
      res.status(409).json({ error: 'Merchant already has a GCA allocation', code: 'ALREADY_ALLOCATED' });
      return;
    }
    const pending = await db.gcaApplication.findFirst({ where: { merchant_id, status: 'PENDING' } });
    if (pending) {
      res.status(409).json({ error: 'Application already pending', code: 'ALREADY_PENDING' });
      return;
    }
    const app = await db.gcaApplication.create({ data: { merchant_id } });
    res.status(201).json({ data: { id: app.id, status: app.status, created_at: app.created_at } });
  });

  // GET /api/gca/application/:merchant_id — latest application for this merchant
  router.get('/application/:merchant_id', async (req: Request, res: Response) => {
    const app = await db.gcaApplication.findFirst({
      where: { merchant_id: req.params.merchant_id as string },
      orderBy: { created_at: 'desc' },
    });
    if (!app) {
      res.status(404).json({ error: 'No application found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: { id: app.id, status: app.status, notes: app.notes, created_at: app.created_at } });
  });

  // GET /api/gca/reserve — live reserve status (public — used by merchant balance display)
  router.get('/reserve', async (_req: Request, res: Response) => {
    const status = await gcaReserveStatus(db);
    res.status(200).json({ data: status });
  });

  // ── Admin endpoints ──────────────────────────────────────────────────────────

  // GET /api/gca/admin/merchants — all merchants' GCA allocations
  router.get('/admin/merchants', adminAuth, async (_req: Request, res: Response) => {
    const allocations = await db.merchantGcaAllocation.findMany({
      include: { merchant: { select: { id: true, name: true } } },
      orderBy: { gca_balance: 'desc' },
    });
    const priceFloor = await currentPriceFloor(db);
    const data = allocations.map((a) => ({
      merchant_id:             a.merchant_id,
      merchant_name:           a.merchant.name,
      gca_balance:             a.gca_balance,
      milestones_claimed:      a.milestones_claimed,
      lifetime_effective_catr: a.lifetime_effective_catr,
      next_milestone_at:       new Decimal((a.milestones_claimed + 1) * 25000).toFixed(2),
      estimated_hnl_value:     new Decimal(a.gca_balance).mul(priceFloor).toFixed(2),
      price_floor_hnl:         priceFloor.toFixed(4),
      gift_claimed:            a.gift_claimed,
    }));
    res.status(200).json({ data });
  });

  // POST /api/gca/admin/gift/:merchant_id — approve evaluated welcome gift
  // Body: { amount_gca: number } — HNDA evaluates the amount per merchant
  router.post('/admin/gift/:merchant_id', adminAuth, async (req: Request, res: Response) => {
    const amountGca = req.body?.amount_gca;
    if (amountGca !== undefined && (typeof amountGca !== 'number' || amountGca <= 0)) {
      res.status(400).json({ error: 'amount_gca must be a positive number', code: 'INVALID_AMOUNT' });
      return;
    }
    try {
      const txHash = await approveGcaGift(db, req.params.merchant_id as string, amountGca);
      const updated = await db.merchantGcaAllocation.findUnique({
        where: { merchant_id: req.params.merchant_id as string },
      });
      res.status(200).json({ data: { ok: true, gca_balance: updated?.gca_balance, gift_claimed: true, tx_hash: txHash } });
    } catch (err: any) {
      const alreadyClaimed = err.message?.includes('already claimed');
      res.status(alreadyClaimed ? 409 : 404).json({ error: err.message, code: alreadyClaimed ? 'ALREADY_CLAIMED' : 'NOT_FOUND' });
    }
  });

  // POST /api/gca/admin/vest/:merchant_id — manually trigger vesting evaluation
  router.post('/admin/vest/:merchant_id', adminAuth, async (req: Request, res: Response) => {
    const allocation = await db.merchantGcaAllocation.findUnique({
      where: { merchant_id: req.params.merchant_id as string },
    });
    if (!allocation) {
      res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
      return;
    }
    await evaluateGcaVesting(db, req.params.merchant_id as string);
    const updated = await db.merchantGcaAllocation.findUnique({
      where: { merchant_id: req.params.merchant_id as string },
    });
    res.status(200).json({ data: { ok: true, new_balance: updated?.gca_balance, milestones_claimed: updated?.milestones_claimed } });
  });

  // GET /api/gca/admin/redemptions — pending redemption queue
  router.get('/admin/redemptions', adminAuth, async (_req: Request, res: Response) => {
    const requests = await db.gcaRedemptionRequest.findMany({
      where: { status: 'PENDING' },
      include: { merchant: { select: { id: true, name: true, wallet_address: true } } },
      orderBy: { created_at: 'asc' },
    });
    res.status(200).json({ data: requests });
  });

  // PATCH /api/gca/admin/redemptions/:id/approve
  router.patch('/admin/redemptions/:id/approve', adminAuth, async (req: Request, res: Response) => {
    const entry = await db.gcaRedemptionRequest.findUnique({
      where: { id: req.params.id as string },
      include: { merchant: { select: { wallet_address: true } } },
    });
    if (!entry || entry.status !== 'PENDING') {
      res.status(404).json({ error: 'Request not found or already processed', code: 'NOT_FOUND' });
      return;
    }
    if (!entry.merchant.wallet_address) {
      res.status(400).json({ error: 'Merchant has no wallet address — cannot burn on-chain', code: 'NO_WALLET' });
      return;
    }

    const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: entry.merchant_id } });
    if (!alloc || new Decimal(alloc.gca_balance).lt(entry.amount_gca)) {
      res.status(400).json({ error: 'Merchant no longer has sufficient GCA', code: 'INSUFFICIENT_GCA' });
      return;
    }

    // DB-first: mark approved before hitting the chain
    let gcaTxId: string;
    await db.$transaction(async (tx) => {
      await tx.merchantGcaAllocation.update({
        where: { merchant_id: entry.merchant_id },
        data: { gca_balance: { decrement: entry.amount_gca } },
      });
      const gcaTx = await tx.gcaTransaction.create({
        data: {
          allocation_id: alloc.id,
          merchant_id: entry.merchant_id,
          type: 'REDEEM',
          amount_gca: entry.amount_gca,
          notes: `Redeemed for ~L. ${entry.amount_hnl_estimated} at floor L. ${entry.price_floor_hnl}/GCA — awaiting on-chain burn`,
        },
      });
      gcaTxId = gcaTx.id;
      await tx.gcaRedemptionRequest.update({
        where: { id: req.params.id as string },
        data: { status: 'APPROVED', approved_by: (req as any).admin?.sub ?? 'admin' },
      });
      // Deduct payout amount from GCA reserve (HNDA is paying this out in HNL)
      await tx.gcaReserve.upsert({
        where:  { id: 'gca-reserve-singleton' },
        update: { balance_hnl: { decrement: new Decimal(entry.amount_hnl_estimated) } },
        create: { id: 'gca-reserve-singleton', balance_hnl: 0 },
      });
    });

    const txHash = await burnGca(entry.merchant.wallet_address, new Decimal(entry.amount_gca).toNumber());
    console.log(`[GCA] REDEEM  merchant=${entry.merchant_id} amount=${entry.amount_gca} GCA  hnl=~L.${entry.amount_hnl_estimated}  tx=${txHash}`);
    await db.gcaTransaction.update({
      where: { id: gcaTxId! },
      data: { notes: `Redeemed for ~L. ${entry.amount_hnl_estimated} at floor L. ${entry.price_floor_hnl}/GCA | burn tx: ${txHash}` },
    });

    res.status(200).json({ data: { id: req.params.id, status: 'APPROVED', tx_hash: txHash } });
  });

  // GET /api/gca/admin/applications — pending GCA applications
  router.get('/admin/applications', adminAuth, async (_req: Request, res: Response) => {
    const apps = await db.gcaApplication.findMany({
      where: { status: 'PENDING' },
      include: { merchant: { select: { id: true, name: true, category: true } } },
      orderBy: { created_at: 'asc' },
    });
    res.status(200).json({ data: apps });
  });

  // PATCH /api/gca/admin/applications/:id/approve — approve + init allocation
  router.patch('/admin/applications/:id/approve', adminAuth, async (req: Request, res: Response) => {
    const app = await db.gcaApplication.findUnique({ where: { id: req.params.id as string } });
    if (!app || app.status !== 'PENDING') {
      res.status(404).json({ error: 'Application not found or already processed', code: 'NOT_FOUND' });
      return;
    }
    const existing = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: app.merchant_id } });
    await db.$transaction(async (tx) => {
      if (!existing) {
        await tx.merchantGcaAllocation.create({
          data: { merchant_id: app.merchant_id, gca_balance: 0, milestones_claimed: 0, gift_claimed: false },
        });
      }
      await tx.gcaApplication.update({
        where: { id: app.id },
        data: { status: 'APPROVED', reviewed_by: (req as any).admin?.sub ?? 'admin', reviewed_at: new Date() },
      });
    });
    res.status(200).json({ data: { id: app.id, status: 'APPROVED', merchant_id: app.merchant_id } });
  });

  // PATCH /api/gca/admin/applications/:id/reject
  router.patch('/admin/applications/:id/reject', adminAuth, async (req: Request, res: Response) => {
    const app = await db.gcaApplication.findUnique({ where: { id: req.params.id as string } });
    if (!app || app.status !== 'PENDING') {
      res.status(404).json({ error: 'Application not found or already processed', code: 'NOT_FOUND' });
      return;
    }
    const updated = await db.gcaApplication.update({
      where: { id: app.id },
      data: {
        status: 'REJECTED',
        notes: req.body?.notes ?? null,
        reviewed_by: (req as any).admin?.sub ?? 'admin',
        reviewed_at: new Date(),
      },
    });
    res.status(200).json({ data: { id: updated.id, status: 'REJECTED' } });
  });

  // PATCH /api/gca/admin/redemptions/:id/reject
  router.patch('/admin/redemptions/:id/reject', adminAuth, async (req: Request, res: Response) => {
    const entry = await db.gcaRedemptionRequest.findUnique({ where: { id: req.params.id as string } });
    if (!entry || entry.status !== 'PENDING') {
      res.status(404).json({ error: 'Request not found or already processed', code: 'NOT_FOUND' });
      return;
    }
    const updated = await db.gcaRedemptionRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'REJECTED', notes: req.body?.notes ?? null },
    });
    res.status(200).json({ data: updated });
  });

  // GET /api/gca/admin/price-floor — current active price floor
  router.get('/admin/price-floor', adminAuth, async (_req: Request, res: Response) => {
    const floor = await db.gcaPriceFloor.findFirst({ where: { active: true }, orderBy: { set_at: 'desc' } });
    res.status(200).json({ data: floor ?? { price_hnl: '1.0000', active: true } });
  });

  // POST /api/gca/admin/price-floor — set a new price floor
  router.post('/admin/price-floor', adminAuth, validate(PriceFloorSchema), async (req: Request, res: Response) => {
    const { price_hnl } = req.body as { price_hnl: number };
    await db.$transaction(async (tx) => {
      await tx.gcaPriceFloor.updateMany({ where: { active: true }, data: { active: false } });
      await tx.gcaPriceFloor.create({
        data: { price_hnl, set_by: (req as any).admin?.sub ?? 'admin', active: true },
      });
    });
    res.status(200).json({ data: { price_hnl } });
  });

  return router;
}
