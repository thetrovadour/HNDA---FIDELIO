import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      admin?: jwt.JwtPayload | string;
      user?: { id: string; role: 'user' };
      merchant?: { id: string; user_id: string };
    }
  }
}

export function bridgeAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.BRIDGE_SECRET;
  const provided = req.headers['x-bridge-secret'];
  if (!secret || typeof provided !== 'string') {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_BRIDGE_SECRET' });
    return;
  }
  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.alloc(secretBuf.length);
  Buffer.from(provided).copy(providedBuf);
  if (!timingSafeEqual(secretBuf, providedBuf)) {
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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    req.admin = decoded as jwt.JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export function userAuth(req: Request, res: Response, next: NextFunction): void {
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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (!decoded.id || decoded.role !== 'user') {
      res.status(403).json({ error: 'Forbidden', code: 'NOT_A_USER_TOKEN' });
      return;
    }
    req.user = { id: decoded.id as string, role: 'user' };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export function selfOrAdmin(req: Request, res: Response, next: NextFunction): void {
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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (decoded.role === 'admin') {
      req.admin = decoded;
      next();
      return;
    }
    if (decoded.role === 'user' && decoded.id === req.params.id) {
      req.user = { id: decoded.id as string, role: 'user' };
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden', code: 'ACCESS_DENIED' });
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export function merchantAuth(req: Request, res: Response, next: NextFunction): void {
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
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (decoded.role === 'admin') {
      req.admin = decoded;
      next();
      return;
    }
    if (decoded.role === 'merchant' && decoded.merchant_id === req.params.id) {
      req.merchant = { id: decoded.merchant_id as string, user_id: decoded.user_id as string };
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden', code: 'ACCESS_DENIED' });
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}
