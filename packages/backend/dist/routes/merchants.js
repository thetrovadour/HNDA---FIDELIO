"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantsRouter = merchantsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const gca_service_1 = require("../services/gca_service");
const CreateMerchantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    wallet_address: zod_1.z.string().min(1),
    contact_email: zod_1.z.string().email(),
});
const UpdateMerchantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    category: zod_1.z.string().min(1).optional(),
    contact_email: zod_1.z.string().email().optional(),
    active: zod_1.z.boolean().optional(),
});
function merchantsRouter() {
    const router = (0, express_1.Router)();
    router.get('/', auth_1.adminAuth, async (_req, res) => {
        const merchants = await db_1.default.merchant.findMany();
        res.status(200).json({ data: merchants });
    });
    router.get('/:id', auth_1.adminAuth, async (req, res) => {
        const merchant = await db_1.default.merchant.findUnique({ where: { id: req.params.id } });
        if (!merchant) {
            res.status(404).json({ error: 'Merchant not found', code: 'NOT_FOUND' });
            return;
        }
        res.status(200).json({ data: merchant });
    });
    router.post('/', auth_1.adminAuth, (0, validate_1.validate)(CreateMerchantSchema), async (req, res) => {
        try {
            const merchant = await db_1.default.merchant.create({ data: req.body });
            await (0, gca_service_1.initGcaAllocation)(db_1.default, merchant.id);
            res.status(201).json({ data: merchant });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    router.patch('/:id', auth_1.adminAuth, (0, validate_1.validate)(UpdateMerchantSchema), async (req, res) => {
        try {
            const merchant = await db_1.default.merchant.update({ where: { id: req.params.id }, data: req.body });
            res.status(200).json({ data: merchant });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    return router;
}
