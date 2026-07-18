import { Request, Response, NextFunction } from 'express';
import { authenticate } from './authenticate';
import { forbidden, unauthorized } from '../utils/errors';
import { adminRepository } from '../routes/admin/admin.repository';
import { AdminUser } from '../routes/admin/admin.types';

/**
 * Express `Request` augmentation for the resolved admin principal.
 *
 * Why: After `requireAdmin` runs, controllers and downstream middleware can
 * read `req.admin` with full type safety (role + expanded permissions).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}

/**
 * Admin authentication middleware.
 *
 * Why: Reuses the existing `authenticate` JWT flow (stateless, Supabase
 * service-role token verification) and then confirms the authenticated user is
 * a registered, active admin. Attaches the resolved `AdminUser` (with
 * permissions expanded from the role) to `req.admin`.
 *
 * Must run AFTER `authenticate`. Returns 403 when the user is not an admin or
 * is deactivated.
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Ensure the JWT was verified first.
  if (!req.user?.id) {
    return next(unauthorized('Admin authentication required'));
  }

  adminRepository
    .getAdminByUserId(req.user.id)
    .then((admin) => {
      if (!admin) {
        return next(forbidden('Your account is not authorized for admin access'));
      }
      if (!admin.isActive) {
        return next(forbidden('This admin account has been deactivated'));
      }
      req.admin = admin;
      next();
    })
    .catch((err) => next(err));
}

/**
 * Composed guard: verify the JWT AND that the caller is an active admin.
 * Convenience for routes that only need admin identity (no specific permission).
 */
export const adminAuth = [authenticate, requireAdmin];
