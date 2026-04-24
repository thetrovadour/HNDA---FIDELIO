import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminAuth, selfOrAdmin } from '../middleware/auth';
import { UserService } from '../services/user_service';
import { TransactionService } from '../services/transaction_service';
import db from '../db';

const CreateUserSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

const UpdateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const UpdateNotificationsSchema = z.object({
  notify_points_received: z.boolean().optional(),
  notify_milestone_near:  z.boolean().optional(),
});

export function usersRouter(userService: UserService, transactionService: TransactionService): Router {
  const router = Router();

  router.post('/', adminAuth, validate(CreateUserSchema), async (req: Request, res: Response) => {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({ data: user });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.get('/:id', selfOrAdmin, async (req: Request, res: Response) => {
    const user = await userService.getUser(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        catr_balance: user.wallet?.catr_balance?.toString() ?? '0',
        wallet_address: user.wallet?.address,
        created_at: user.created_at,
        notify_points_received: user.notify_points_received,
        notify_milestone_near:  user.notify_milestone_near,
      },
    });
  });

  router.patch('/:id/notifications', selfOrAdmin, validate(UpdateNotificationsSchema), async (req: Request, res: Response) => {
    try {
      const user = await db.user.update({ where: { id: req.params.id }, data: req.body });
      res.status(200).json({
        data: {
          notify_points_received: user.notify_points_received,
          notify_milestone_near:  user.notify_milestone_near,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.patch('/:id', selfOrAdmin, validate(UpdateUserSchema), async (req: Request, res: Response) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.status(200).json({
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone ?? undefined,
          created_at: user.created_at,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    }
  });

  router.get('/:id/transactions', selfOrAdmin, async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await transactionService.getUserTransactions(req.params.id, page, limit);
    res.status(200).json({ data: result.transactions, total: result.total, page, limit });
  });

  return router;
}
