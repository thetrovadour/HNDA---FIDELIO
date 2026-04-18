"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardsRouter = rewardsRouter;
const express_1 = require("express");
const library_1 = require("@prisma/client/runtime/library");
const auth_1 = require("../middleware/auth");
const RESERVE_FLOOR = new library_1.Decimal('0.15'); // 15% minimum pool reserve
const POOL_SHARE = new library_1.Decimal('0.35'); // 35% of commission goes to reward pool
async function estimatedPoolBalance(db) {
    const [inflowAgg, paidAgg] = await Promise.all([
        db.transaction.aggregate({
            where: { type: 'SPEND', status: 'CONFIRMED' },
            _sum: { commission_catr: true },
        }),
        db.rewardPayoutQueue.aggregate({
            where: { status: 'PAID' },
            _sum: { amount_catr: true },
        }),
    ]);
    const totalInflow = new library_1.Decimal(inflowAgg._sum.commission_catr ?? 0).mul(POOL_SHARE);
    const totalPaid = new library_1.Decimal(paidAgg._sum.amount_catr ?? 0);
    return totalInflow.minus(totalPaid);
}
function rewardsRouter(db) {
    const router = (0, express_1.Router)();
    router.get('/queue', auth_1.adminAuth, async (_req, res) => {
        const queue = await db.rewardPayoutQueue.findMany();
        res.status(200).json({ data: queue });
    });
    router.get('/:user_id', auth_1.adminAuth, async (req, res) => {
        const milestones = await db.rewardMilestone.findMany({
            where: { user_id: req.params.user_id },
        });
        res.status(200).json({ data: milestones });
    });
    router.patch('/queue/:id/approve', auth_1.adminAuth, async (req, res) => {
        try {
            const entry = await db.rewardPayoutQueue.findUnique({ where: { id: req.params.id } });
            if (!entry) {
                res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
                return;
            }
            // Pool solvency gate: ensure payout does not breach the 15% reserve floor
            const poolBalance = await estimatedPoolBalance(db);
            const payoutAmount = new library_1.Decimal(entry.amount_catr);
            const balanceAfter = poolBalance.minus(payoutAmount);
            if (balanceAfter.lt(poolBalance.mul(RESERVE_FLOOR))) {
                const deferred = await db.rewardPayoutQueue.update({
                    where: { id: req.params.id },
                    data: { status: 'DEFERRED' },
                });
                res.status(402).json({
                    error: 'Pool solvency check failed — payout deferred until pool is replenished',
                    code: 'POOL_INSUFFICIENT',
                    pool_balance: poolBalance.toFixed(4),
                    payout_amount: payoutAmount.toFixed(4),
                    data: deferred,
                });
                return;
            }
            const updated = await db.rewardPayoutQueue.update({
                where: { id: req.params.id },
                data: { status: 'PAID', approved_by: req.admin?.sub ?? 'admin' },
            });
            res.status(200).json({ data: updated });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    return router;
}
