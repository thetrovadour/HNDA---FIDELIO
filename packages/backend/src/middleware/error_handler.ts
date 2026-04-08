import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON', code: 'BAD_REQUEST' });
    return;
  }

  // Body too large
  if ((err as any).type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
