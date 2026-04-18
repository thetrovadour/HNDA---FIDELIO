"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = authRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const db_1 = __importDefault(require("../db"));
const PilotLoginSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(1),
    pin: zod_1.z.string().length(4),
});
function authRouter() {
    const router = (0, express_1.Router)();
    router.post('/pilot-login', (0, validate_1.validate)(PilotLoginSchema), async (req, res) => {
        const { full_name, pin } = req.body;
        const user = await db_1.default.user.findFirst({
            where: { full_name, pin },
            include: { wallet: true },
        });
        if (!user) {
            res.status(401).json({ error: 'No encontramos tu cuenta', code: 'INVALID_CREDENTIALS' });
            return;
        }
        const [transactions, milestones, merchants] = await Promise.all([
            db_1.default.transaction.findMany({
                where: { user_id: user.id },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
            db_1.default.rewardMilestone.findMany({
                where: { user_id: user.id },
            }),
            db_1.default.merchant.findMany({ where: { active: true } }),
        ]);
        res.status(200).json({
            data: {
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
