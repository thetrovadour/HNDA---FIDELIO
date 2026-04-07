import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);
  const body: ApiError = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(body);
}
