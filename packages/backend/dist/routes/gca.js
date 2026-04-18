"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gcaRouter = gcaRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const library_1 = require("@prisma/client/runtime/library");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const gca_service_1 = require("../services/gca_service");
const TradeSchema = zod_1.z.object({
    from_merchant_id: zod_1.z.string().uuid(),
    to_merchant_id: zod_1.z.string().uuid(),
    amount_gca: zod_1.z.number().positive(),
    catr_paid: zod_1.z.number().positive(),
});
const RedeemSchema = zod_1.z.object({
    merchant_id: zod_1.z.string().uuid(),
    amount_gca: zod_1.z.number().positive(),
});
const PriceFloorSchema = zod_1.z.object({
    price_hnl: zod_1.z.number().positive(),
});
function gcaRouter(db) {
    const router = (0, express_1.Router)();
    // GET /api/gca/:merchant_id — balance + HNL estimate
    router.get('/:merchant_id', async (req, res) => {
        const allocation = await db.merchantGcaAllocation.findUnique({
            where: { merchant_id: req.params.merchant_id },
        });
        if (!allocation) {
            res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
            return;
        }
        const priceFloor = await (0, gca_service_1.currentPriceFloor)(db);
        const estimatedHnl = new library_1.Decimal(allocation.gca_balance).mul(priceFloor);
        res.status(200).json({
            data: {
                gca_balance: allocation.gca_balance,
                milestones_claimed: allocation.milestones_claimed,
                milestones_remaining: 10 - allocation.milestones_claimed,
                lifetime_effective_catr: allocation.lifetime_effective_catr,
                next_milestone_at: new library_1.Decimal((allocation.milestones_claimed + 1) * 25000).toFixed(2),
                price_floor_hnl: priceFloor.toFixed(4),
                estimated_hnl_value: estimatedHnl.toFixed(2),
            },
        });
    });
    // GET /api/gca/:merchant_id/history — transaction log
    router.get('/:merchant_id/history', async (req, res) => {
        const history = await db.gcaTransaction.findMany({
            where: { merchant_id: req.params.merchant_id },
            orderBy: { created_at: 'desc' },
        });
        res.status(200).json({ data: history });
    });
    // POST /api/gca/trade — merchant-to-merchant trade
    router.post('/trade', (0, validate_1.validate)(TradeSchema), async (req, res) => {
        const { from_merchant_id, to_merchant_id, amount_gca, catr_paid } = req.body;
        const fromAlloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: from_merchant_id } });
        if (!fromAlloc) {
            res.status(404).json({ error: 'Sender has no GCA allocation', code: 'NOT_FOUND' });
            return;
        }
        if (new library_1.Decimal(fromAlloc.gca_balance).lt(amount_gca)) {
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
    router.post('/redeem', (0, validate_1.validate)(RedeemSchema), async (req, res) => {
        const { merchant_id, amount_gca } = req.body;
        const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id } });
        if (!alloc) {
            res.status(404).json({ error: 'No GCA allocation found', code: 'NOT_FOUND' });
            return;
        }
        if (new library_1.Decimal(alloc.gca_balance).lt(amount_gca)) {
            res.status(400).json({ error: 'Insufficient GCA balance', code: 'INSUFFICIENT_GCA' });
            return;
        }
        const priceFloor = await (0, gca_service_1.currentPriceFloor)(db);
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
    // GET /api/gca/admin/redemptions — pending redemption queue
    router.get('/admin/redemptions', auth_1.adminAuth, async (_req, res) => {
        const requests = await db.gcaRedemptionRequest.findMany({
            where: { status: 'PENDING' },
            include: { merchant: { select: { id: true, name: true, wallet_address: true } } },
            orderBy: { created_at: 'asc' },
        });
        res.status(200).json({ data: requests });
    });
    // PATCH /api/gca/admin/redemptions/:id/approve
    router.patch('/admin/redemptions/:id/approve', auth_1.adminAuth, async (req, res) => {
        const entry = await db.gcaRedemptionRequest.findUnique({ where: { id: req.params.id } });
        if (!entry || entry.status !== 'PENDING') {
            res.status(404).json({ error: 'Request not found or already processed', code: 'NOT_FOUND' });
            return;
        }
        const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: entry.merchant_id } });
        if (!alloc || new library_1.Decimal(alloc.gca_balance).lt(entry.amount_gca)) {
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
                data: { status: 'APPROVED', approved_by: req.admin?.sub ?? 'admin' },
            });
        });
        res.status(200).json({ data: { id: req.params.id, status: 'APPROVED' } });
    });
    // PATCH /api/gca/admin/redemptions/:id/reject
    router.patch('/admin/redemptions/:id/reject', auth_1.adminAuth, async (req, res) => {
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
    router.get('/admin/price-floor', auth_1.adminAuth, async (_req, res) => {
        const floor = await db.gcaPriceFloor.findFirst({ where: { active: true }, orderBy: { set_at: 'desc' } });
        res.status(200).json({ data: floor ?? { price_hnl: '1.0000', active: true } });
    });
    // POST /api/gca/admin/price-floor — set a new price floor
    router.post('/admin/price-floor', auth_1.adminAuth, (0, validate_1.validate)(PriceFloorSchema), async (req, res) => {
        const { price_hnl } = req.body;
        await db.$transaction(async (tx) => {
            await tx.gcaPriceFloor.updateMany({ where: { active: true }, data: { active: false } });
            await tx.gcaPriceFloor.create({
                data: { price_hnl, set_by: req.admin?.sub ?? 'admin', active: true },
            });
        });
        res.status(200).json({ data: { price_hnl } });
    });
    return router;
}
