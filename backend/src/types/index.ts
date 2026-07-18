import { Request, Response, NextFunction } from 'express';

/**
 * Shared API error shape returned to clients.
 */
export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

/**
 * Async wrapper to avoid repeating try/catch in route handlers.
 * Passes rejected promises to the Express error middleware.
 */
export const asyncHandler =
  (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
