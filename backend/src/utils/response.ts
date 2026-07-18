import { Response } from 'express';

/**
 * Standardized API response helpers.
 *
 * Why: Every route should return a consistent envelope so clients (and the
 * mobile app) can parse responses uniformly. Centralizing this avoids ad-hoc
 * `res.json` shapes scattered across controllers.
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { status: 'success', data };
  res.status(status).json(body);
}

export function sendMessage(res: Response, message: string, status = 200): void {
  const body: ApiResponse<null> = { status: 'success', message };
  res.status(status).json(body);
}
