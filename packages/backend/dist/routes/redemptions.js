"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redemptionsRouter = redemptionsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const CreateRedemptionSchema = zod_1.z.object({
    merchant_id: zod_1.z.string().uuid(),
    amount_catr: zod_1.z.string().min(1),
});
function redemptionsRouter(redemptionService) {
    const router = (0, express_1.Router)();
    router.post('/', auth_1.adminAuth, (0, validate_1.validate)(CreateRedemptionSchema), async (req, res) => {
        try {
            const result = await redemptionService.createRequest(req.body.merchant_id, req.body.amount_catr);
            res.status(201).json({ data: result });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    router.get('/:id', auth_1.adminAuth, async (req, res) => {
        try {
            const { db } = redemptionService;
            const request = await db.redemptionRequest.findUnique({ where: { id: req.params.id } });
            if (!request) {
                res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
                return;
            }
            res.status(200).json({ data: request });
        }
        catch (err) {
            res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
        }
    });
    router.get('/', auth_1.adminAuth, async (req, res) => {
        try {
            const { db } = redemptionService;
            const where = {};
            if (req.query.status)
                where.status = req.query.status;
            if (req.query.tier)
                where.tier = req.query.tier;
            const results = await db.redemptionRequest.findMany({ where });
            res.status(200).json({ data: results });
        }
        catch (err) {
            res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
        }
    });
    router.patch('/:id/approve', auth_1.adminAuth, async (req, res) => {
        try {
            const admin = req.admin;
            const result = await redemptionService.approveRequest(req.params.id, admin?.sub ?? 'admin');
            res.status(200).json({ data: result });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    router.patch('/:id/reject', auth_1.adminAuth, async (req, res) => {
        try {
            const { db } = redemptionService;
            await db.redemptionRequest.update({
                where: { id: req.params.id },
                data: { status: 'FAILED' },
            });
            res.status(200).json({ status: 'ok' });
        }
        catch (err) {
            res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
        }
    });
    return router;
}
