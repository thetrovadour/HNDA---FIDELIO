"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = adminRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const library_1 = require("@prisma/client/runtime/library");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const POOL_SHARE = new library_1.Decimal('0.35');
const COMMISSION_RATE = new library_1.Decimal('0.036');
// Avg CATR per transaction assuming L.500 avg spend × 3.6% commission × 35% pool share
const BREAKEVEN_MONTHLY_FIXED_COSTS = new library_1.Decimal('0'); // no fixed costs yet
const BRIDGE_HTTP_URL = process.env.BRIDGE_HTTP_URL ?? 'http://localhost:3002';
const AdminMintSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive().max(10000),
});
function adminRouter(mintService) {
    const router = (0, express_1.Router)();
    // List all users with their wallets — so admin can find user IDs by name
    router.get('/users', auth_1.adminAuth, async (_req, res) => {
        const users = await db_1.default.user.findMany({
            include: { wallet: true },
            orderBy: { created_at: 'desc' },
        });
        res.status(200).json({ data: users });
    });
    // Award CATR to a user by user_id
    router.post('/mint', auth_1.adminAuth, (0, validate_1.validate)(AdminMintSchema), async (req, res) => {
        const { user_id, amount } = req.body;
        const wallet = await db_1.default.wallet.findUnique({ where: { user_id } });
        if (!wallet) {
            res.status(404).json({ error: 'User has no wallet', code: 'NO_WALLET' });
            return;
        }
        const reference_code = `ADMIN-${user_id}-${Date.now()}`;
        const result = await mintService.receivePaymentEvent({
            reference_code,
            amount_lempiras: amount,
            client_wallet: wallet.address,
            source: 'ADMIN',
            received_at: Math.floor(Date.now() / 1000),
        });
        if (result.status === 'NACK') {
            res.status(409).json(result);
            return;
        }
        // Tell the bridge to execute the mint immediately
        try {
            const bridgeRes = await fetch(`${BRIDGE_HTTP_URL}/mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference_code,
                    amount_lempiras: amount,
                    client_wallet: wallet.address,
                    source: 'ADMIN',
                    received_at: Math.floor(Date.now() / 1000),
                }),
            });
            if (!bridgeRes.ok) {
                const err = await bridgeRes.text();
                console.error('[admin/mint] Bridge returned error:', err);
            }
        }
        catch (err) {
            console.error('[admin/mint] Could not reach bridge:', err);
        }
        res.status(200).json({
            data: { reference_code, wallet_address: wallet.address, amount },
        });
    });
    router.get('/runway', auth_1.adminAuth, async (_req, res) => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [inflowAgg, paidAgg, merchantCount, recentInflowAgg, recentPaidAgg] = await Promise.all([
            db_1.default.transaction.aggregate({
                where: { type: 'SPEND', status: 'CONFIRMED' },
                _sum: { commission_catr: true },
                _count: { id: true },
            }),
            db_1.default.rewardPayoutQueue.aggregate({
                where: { status: 'PAID' },
                _sum: { amount_catr: true },
            }),
            db_1.default.merchant.count(),
            db_1.default.transaction.aggregate({
                where: { type: 'SPEND', status: 'CONFIRMED', created_at: { gte: thirtyDaysAgo } },
                _sum: { commission_catr: true },
            }),
            db_1.default.rewardPayoutQueue.aggregate({
                where: { status: 'PAID', created_at: { gte: thirtyDaysAgo } },
                _sum: { amount_catr: true },
            }),
        ]);
        const poolBalance = new library_1.Decimal(inflowAgg._sum.commission_catr ?? 0)
            .mul(POOL_SHARE)
            .minus(new library_1.Decimal(paidAgg._sum.amount_catr ?? 0));
        const monthlyInflow = new library_1.Decimal(recentInflowAgg._sum.commission_catr ?? 0).mul(POOL_SHARE);
        const monthlyOutflow = new library_1.Decimal(recentPaidAgg._sum.amount_catr ?? 0);
        const monthlyNet = monthlyInflow.minus(monthlyOutflow);
        // Runway: how many months until pool hits zero (only meaningful if outflow > inflow)
        let projected_runway_months;
        if (monthlyNet.gte(0)) {
            projected_runway_months = 'sustainable';
        }
        else {
            const months = poolBalance.div(monthlyNet.abs());
            projected_runway_months = months.toFixed(1);
        }
        // Breakeven: merchants needed so monthly inflow >= monthly outflow
        // Assumes avg 20 txns/merchant/month at L.500 avg → 10,000 CATR/merchant/month gross
        // Pool inflow per merchant: 10000 × 3.6% × 35% = 126 CATR/month
        // Monthly cashback per merchant (avg TX_5 rate 0.5%): 10000 × 0.5% = 50 CATR/month
        // Net per merchant: 76 CATR/month surplus → breakeven is 0 if per-merchant is always surplus
        // The ~83 number comes from covering fixed operational CATR costs (admin mints etc.)
        const totalAdminMinted = await db_1.default.pendingMint.aggregate({
            where: { source: 'ADMIN', status: 'MINTED' },
            _sum: { amount_lempiras: true },
        });
        const adminCost = new library_1.Decimal(totalAdminMinted._sum?.amount_lempiras ?? 0);
        const poolInflowPerMerchant = new library_1.Decimal('126'); // CATR/month per merchant (see above)
        const breakeven_merchants = adminCost.gt(0)
            ? adminCost.div(poolInflowPerMerchant).toFixed(0)
            : 'N/A';
        res.status(200).json({
            data: {
                pool_balance: poolBalance.toFixed(4),
                active_merchants: merchantCount,
                monthly_pool_inflow: monthlyInflow.toFixed(4),
                monthly_cashback_outflow: monthlyOutflow.toFixed(4),
                monthly_net: monthlyNet.toFixed(4),
                projected_runway_months,
                breakeven_merchants,
                total_transactions: inflowAgg._count.id,
            },
        });
    });
    return router;
}
