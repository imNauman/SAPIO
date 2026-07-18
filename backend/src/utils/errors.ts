import { Response, NextFunction, Request } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../types';

/**
 * Typed application error. Throw anywhere; the error middleware converts it to
 * a consistent JSON response.
 */
export class AppError extends Error implements ApiError {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, details);
export const unauthorized = (message = 'Unauthorized') =>
  new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);
export const conflict = (message: string) => new AppError(409, message);

/**
 * Centralized Express error handler.
 *
 * Why: A single handler keeps error formatting consistent and lets controllers
 * throw domain errors (or Zod validation errors) without manual serialization.
 * Must keep 4 arguments so Express recognizes it as an error middleware.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      status: 'error',
      message: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      status: 'error',
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Unknown / unexpected error
  // eslint-disable-next-line no-console
  console.error('[Unhandled error]', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
}
