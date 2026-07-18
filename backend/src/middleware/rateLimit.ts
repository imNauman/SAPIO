import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors';

/**
 * Rate-limiting middleware factory.
 *
 * Why: Production hardening. Express-rate-limit guards against brute-force and
 * abuse (login sprays, message floods, scraping). We expose a few tuned
 * presets rather than a one-size-fits-all limit so each surface gets an
 * appropriate ceiling. The handler throws `AppError` (429) so the central
 * error handler returns the consistent envelope.
 *
 * Reuses the existing `AppError`/`errorHandler` envelope — no new response
 * shape is introduced.
 */

const standardHeaders = true as const;
const legacyHeaders = false as const;

/** General API ceiling — protects every authenticated route. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // ~40 req/min sustained
  standardHeaders,
  legacyHeaders,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'Too many requests, please slow down.')),
});

/** Strict limit for auth/login — blunts credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 login attempts / 15 min / IP
  standardHeaders,
  legacyHeaders,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'Too many login attempts, try again later.')),
});

/** Tight limit for chat sends — prevents message flooding. */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 1 msg/sec sustained
  standardHeaders,
  legacyHeaders,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'Message rate limit exceeded, slow down.')),
});

/** Upload limit — bounds storage abuse. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 uploads / min / IP
  standardHeaders,
  legacyHeaders,
  handler: (_req, _res, next) =>
    next(new AppError(429, 'Upload rate limit exceeded, slow down.')),
});
