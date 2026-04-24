import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { currentPriceFloor, evaluateGcaVesting } from '../services/gca_service';

const TradeSchema = z.object({
  from_merchant_id: z.string().uuid(),
  to_merchant_id:   z.string().uuid(),
  amount_gca:       z.number().positive(),
  catr_paid:        z.number().positive(),
});

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
      where: { merchant_id: req.params.merchant_id },
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
      where: { merchant_id: req.params.merchant_id },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ data: history });
  });

  // POST /api/gca/trade — merchant-to-merchant trade
  router.post('/trade', validate(TradeSchema), async (req: Request, res: Response) => {
    const { from_merchant_id, to_merchant_id, amount_gca, catr_paid } = req.body as z.infer<typeof TradeSchema>;

    const fromAlloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: from_merchant_id } });
    if (!fromAlloc) {
      res.status(404).json({ error: 'Sender has no GCA allocation', code: 'NOT_FOUND' });
      return;
    }
    if (new Decimal(fromAlloc.gca_balance).lt(amount_gca)) {
      res.status(400).json({ error: 'Insufficient GCA balance', code: 'INSUFFICIENT_GCA' });
      return;
    }

    const toAlloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: to_merchant_id } });
    if (!toAlloc) {
      res.status(404).json({ error: 'Recipient has no GCA allocation', code: 'NOT_FOUND' });
      return;
    }

    await db.$transaction(async (tx) => {
      await tx.merchantGcaAllocation.update({
        where: { merchant_id: from_merchant_id },
        data: { gca_balance: { decrement: amount_gca } },
      });
      await tx.merchantGcaAllocation.update({
        where: { merchant_id: to_merchant_id },
        data: { gca_balance: { increment: amount_gca } },
      });
      await tx.gcaTransaction.create({
        data: {
          allocation_id: fromAlloc.id,
          merchant_id: from_merchant_id,
          type: 'TRADE_OUT',
          amount_gca,
          counterpart_merchant_id: to_merchant_id,
          catr_paid,
        },
      });
      await tx.gcaTransaction.create({
        data: {
          allocation_id: toAlloc.id,
          merchant_id: to_merchant_id,
          type: 'TRADE_IN',
          amount_gca,
          counterpart_merchant_id: from_merchant_id,
          catr_paid,
        },
      });
    });

    res.status(200).json({ data: { from_merchant_id, to_merchant_id, amount_gca, catr_paid } });
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
    }));
    res.status(200).json({ data });
  });

  // POST /api/gca/admin/vest/:merchant_id — manually trigger vesting evaluation
  router.post('/admin/vest/:merchant_id', adminAuth, async (req: Request, res: Response) => {
    const allocation = await db.merchantGcaAllocation.findUnique({
      where: { merchant_id: req.params.merchant_id },
    });
    if (!allocation) {
      res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
      return;
    }
    await evaluateGcaVesting(db, req.params.merchant_id);
    const updated = await db.merchantGcaAllocation.findUnique({
      where: { merchant_id: req.params.merchant_id },
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
    const entry = await db.gcaRedemptionRequest.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.status !== 'PENDING') {
      res.status(404).json({ error: 'Request not found or already processed', code: 'NOT_FOUND' });
      return;
    }

    const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: entry.merchant_id } });
    if (!alloc || new Decimal(alloc.gca_balance).lt(entry.amount_gca)) {
      res.status(400).json({ error: 'Merchant no longer has sufficient GCA', code: 'INSUFFICIENT_GCA' });
      return;
    }

    await db.$transaction(async (tx) => {
      await tx.merchantGcaAllocation.update({
        where: { merchant_id: entry.merchant_id },
        data: { gca_balance: { decrement: entry.amount_gca } },
      });
      await tx.gcaTransaction.create({
        data: {
          allocation_id: alloc.id,
          merchant_id: entry.merchant_id,
          type: 'REDEEM',
          amount_gca: entry.amount_gca,
          notes: `Redeemed for ~L. ${entry.amount_hnl_estimated} at floor L. ${entry.price_floor_hnl}/GCA`,
        },
      });
      await tx.gcaRedemptionRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approved_by: (req as any).admin?.sub ?? 'admin' },
      });
    });

    res.status(200).json({ data: { id: req.params.id, status: 'APPROVED' } });
  });

  // PATCH /api/gca/admin/redemptions/:id/reject
  router.patch('/admin/redemptions/:id/reject', adminAuth, async (req: Request, res: Response) => {
    const entry = await db.gcaRedemptionRequest.findUnique({ where: { id: req.params.id } });
    if (!entry || entry.status !== 'PENDING') {
      res.status(404).json({ error: 'Request not found or already processed', code: 'NOT_FOUND' });
      return;
    }
    const updated = await db.gcaRedemptionRequest.update({
      where: { id: req.params.id },
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
