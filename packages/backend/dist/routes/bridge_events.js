"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridgeEventsRouter = bridgeEventsRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const PaymentEventSchema = zod_1.z.object({
    reference_code: zod_1.z.string().min(1),
    amount_lempiras: zod_1.z.number().positive(),
    client_wallet: zod_1.z.string().min(1),
    source: zod_1.z.enum(['EMAIL', 'NFC', 'WEBHOOK']),
    received_at: zod_1.z.number(),
});
const MintConfirmedSchema = zod_1.z.object({
    reference_code: zod_1.z.string().min(1),
    tx_hash: zod_1.z.string().min(1),
    block_number: zod_1.z.number().optional(),
});
function bridgeEventsRouter(mintService) {
    const router = (0, express_1.Router)();
    router.post('/payment-received', (0, validate_1.validate)(PaymentEventSchema), async (req, res) => {
        const result = await mintService.receivePaymentEvent(req.body);
        if (result.status === 'NACK') {
            res.status(409).json(result);
            return;
        }
        res.status(200).json(result);
    });
    router.post('/mint-confirmed', (0, validate_1.validate)(MintConfirmedSchema), async (req, res) => {
        try {
            await mintService.confirmMint(req.body.reference_code, req.body.tx_hash);
            res.status(200).json({ status: 'ok' });
        }
        catch (err) {
            res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
        }
    });
    return router;
}
