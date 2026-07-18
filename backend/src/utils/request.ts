import { Request } from 'express';

/**
 * Best-effort client IP extraction for audit logging.
 *
 * Why: Several admin controllers need the caller's IP for the audit trail.
 * Centralizing the extraction keeps the header-parsing logic in one place so
 * it can't drift between controllers.
 */
export function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip ?? null;
}
