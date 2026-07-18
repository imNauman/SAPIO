import { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/errors';
import { AdminPermission } from '../routes/admin/admin.types';

/**
 * Permission-gating middleware factory.
 *
 * Why: Mirrors the existing `requireFeature` pattern but for the admin RBAC
 * model. Call `requirePermission('manage_users')` to guard a route; the
 * middleware checks the resolved admin's expanded permission set (attached by
 * `requireAdmin`) and rejects with 403 when the capability is absent.
 *
 * The `requireAdmin` middleware MUST run before this one (it sets `req.admin`).
 */
export function requirePermission(permissionKey: AdminPermission) {
  return function requirePermissionMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    const admin = req.admin;
    if (!admin) {
      return next(forbidden('Admin authentication required'));
    }
    if (!admin.permissions.includes(permissionKey)) {
      return next(
        forbidden(`You lack the required permission: ${permissionKey}`),
      );
    }
    next();
  };
}
