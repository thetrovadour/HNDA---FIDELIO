"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardsRouter = rewardsRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
function rewardsRouter() {
    const router = (0, express_1.Router)();
    router.get('/queue', auth_1.adminAuth, async (_req, res) => {
        const queue = await db_1.default.rewardPayoutQueue.findMany();
        res.status(200).json({ data: queue });
    });
    router.get('/:user_id', auth_1.adminAuth, async (req, res) => {
        const milestones = await db_1.default.rewardMilestone.findMany({
            where: { user_id: req.params.user_id },
        });
        res.status(200).json({ data: milestones });
    });
    router.patch('/queue/:id/approve', auth_1.adminAuth, async (req, res) => {
        try {
            const entry = await db_1.default.rewardPayoutQueue.findUnique({ where: { id: req.params.id } });
            if (!entry) {
                res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
                return;
            }
            const updated = await db_1.default.rewardPayoutQueue.update({
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
