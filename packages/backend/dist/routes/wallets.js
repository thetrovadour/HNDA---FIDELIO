"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletsRouter = walletsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const db_1 = __importDefault(require("../db"));
const CreateWalletSchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    address: zod_1.z.string().min(1),
});
function walletsRouter(userService) {
    const router = (0, express_1.Router)();
    router.post('/', (0, validate_1.validate)(CreateWalletSchema), async (req, res) => {
        try {
            const wallet = await userService.createWallet(req.body.user_id, req.body.address);
            res.status(201).json({ data: wallet });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    router.get('/:address', async (req, res) => {
        const wallet = await db_1.default.wallet.findUnique({ where: { address: req.params.address } });
        if (!wallet) {
            res.status(404).json({ error: 'Wallet not found', code: 'NOT_FOUND' });
            return;
        }
        res.status(200).json({ data: wallet });
    });
    return router;
}
