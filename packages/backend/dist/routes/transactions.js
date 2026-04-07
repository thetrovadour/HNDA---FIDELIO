"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsRouter = transactionsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const SpendSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    merchant_id: zod_1.z.string().uuid(),
    amount_catr: zod_1.z.string().min(1),
});
function transactionsRouter(transactionService) {
    const router = (0, express_1.Router)();
    router.get('/:id', auth_1.adminAuth, async (req, res) => {
        const tx = await db_1.default.transaction.findUnique({ where: { id: req.params.id } });
        if (!tx) {
            res.status(404).json({ error: 'Transaction not found', code: 'NOT_FOUND' });
            return;
        }
        res.status(200).json({ data: tx });
    });
    router.post('/spend', auth_1.adminAuth, (0, validate_1.validate)(SpendSchema), async (req, res) => {
        try {
            const tx = await transactionService.recordSpend(req.body);
            res.status(201).json({ data: tx });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    return router;
}
