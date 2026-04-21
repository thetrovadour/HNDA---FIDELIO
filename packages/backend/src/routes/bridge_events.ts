import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { MintService } from '../services/mint_service';
import { RedemptionService } from '../services/redemption_service';

const PaymentEventSchema = z.object({
  reference_code: z.string().min(1),
  amount_lempiras: z.number().positive(),
  client_wallet: z.string().min(1),
  source: z.enum(['EMAIL', 'NFC', 'WEBHOOK']),
  received_at: z.number(),
});

const MintConfirmedSchema = z.object({
  reference_code: z.string().min(1),
  tx_hash: z.string().min(1),
  block_number: z.number().optional(),
});

const BurnConfirmedSchema = z.object({
  redemption_id: z.string().uuid(),
  tx_hash: z.string().min(1),
});

export function bridgeEventsRouter(mintService: MintService, redemptionService: RedemptionService): Router {
  const router = Router();

  router.post('/payment-received', validate(PaymentEventSchema), async (req: Request, res: Response) => {
    const result = await mintService.receivePaymentEvent(req.body);
    if (result.status === 'NACK') {
      res.status(409).json(result);
      return;
    }
    res.status(200).json(result);
  });

  router.post('/mint-confirmed', validate(MintConfirmedSchema), async (req: Request, res: Response) => {
    try {
      await mintService.confirmMint(req.body.reference_code, req.body.tx_hash);
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
  });

  router.post('/burn-confirmed', validate(BurnConfirmedSchema), async (req: Request, res: Response) => {
    try {
      await redemptionService.confirmBurn(req.body.redemption_id, req.body.tx_hash);
      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  return router;
}
