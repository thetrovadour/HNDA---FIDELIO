import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminAuth } from '../middleware/auth';
import { MintService } from '../services/mint_service';
import db from '../db';

const BRIDGE_HTTP_URL = process.env.BRIDGE_HTTP_URL ?? 'http://localhost:3002';

const AdminMintSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive().max(10000),
});

export function adminRouter(mintService: MintService): Router {
  const router = Router();

  // List all users with their wallets — so admin can find user IDs by name
  router.get('/users', adminAuth, async (_req: Request, res: Response) => {
    const users = await db.user.findMany({
      include: { wallet: true },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ data: users });
  });

  // Award CATR to a user by user_id
  router.post('/mint', adminAuth, validate(AdminMintSchema), async (req: Request, res: Response) => {
    const { user_id, amount } = req.body as { user_id: string; amount: number };

    const wallet = await db.wallet.findUnique({ where: { user_id } });
    if (!wallet) {
      res.status(404).json({ error: 'User has no wallet', code: 'NO_WALLET' });
      return;
    }

    const reference_code = `ADMIN-${user_id}-${Date.now()}`;

    const result = await mintService.receivePaymentEvent({
      reference_code,
      amount_lempiras: amount,
      client_wallet: wallet.address,
      source: 'ADMIN',
      received_at: Math.floor(Date.now() / 1000),
    });

    if (result.status === 'NACK') {
      res.status(409).json(result);
      return;
    }

    // Tell the bridge to execute the mint immediately
    try {
      const bridgeRes = await fetch(`${BRIDGE_HTTP_URL}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_code,
          amount_lempiras: amount,
          client_wallet: wallet.address,
          source: 'ADMIN',
          received_at: Math.floor(Date.now() / 1000),
        }),
      });
      if (!bridgeRes.ok) {
        const err = await bridgeRes.text();
        console.error('[admin/mint] Bridge returned error:', err);
      }
    } catch (err) {
      console.error('[admin/mint] Could not reach bridge:', err);
    }

    res.status(200).json({
      data: { reference_code, wallet_address: wallet.address, amount },
    });
  });

  return router;
}
