import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { UserService } from '../services/user_service';
import db from '../db';

const CreateWalletSchema = z.object({
  user_id: z.string().uuid(),
  address: z.string().min(1),
});

export function walletsRouter(userService: UserService): Router {
  const router = Router();

  router.post('/', validate(CreateWalletSchema), async (req: Request, res: Response) => {
    try {
      const wallet = await userService.createWallet(req.body.user_id, req.body.address);
      res.status(201).json({ data: wallet });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.get('/:address', async (req: Request, res: Response) => {
    const wallet = await db.wallet.findUnique({ where: { address: req.params.address } });
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ data: wallet });
  });

  return router;
}
