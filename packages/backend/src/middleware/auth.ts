import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function bridgeAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.BRIDGE_SECRET;
  if (!secret || req.headers['x-bridge-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_BRIDGE_SECRET' });
    return;
  }
  next();
}

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(401).json({ error: 'Unauthorized', code: 'JWT_NOT_CONFIGURED' });
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}
