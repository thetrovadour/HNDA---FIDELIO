"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = usersRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const CreateUserSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
});
function usersRouter(userService, transactionService) {
    const router = (0, express_1.Router)();
    router.post('/', auth_1.adminAuth, (0, validate_1.validate)(CreateUserSchema), async (req, res) => {
        try {
            const user = await userService.createUser(req.body);
            res.status(201).json({ data: user });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    router.get('/:id', auth_1.selfOrAdmin, async (req, res) => {
        const user = await userService.getUser(req.params.id);
        if (!user) {
            res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
            return;
        }
        res.status(200).json({ data: user });
    });
    router.get('/:id/transactions', auth_1.selfOrAdmin, async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await transactionService.getUserTransactions(req.params.id, page, limit);
        res.status(200).json({ data: result.transactions, total: result.total, page, limit });
    });
    return router;
}
