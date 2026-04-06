import { Router, Request, Response } from 'express';
import db from '../db';

export function healthRouter(): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', db: 'ok' });
    } catch {
      res.status(200).json({ status: 'ok', db: 'error' });
    }
  });

  return router;
}
