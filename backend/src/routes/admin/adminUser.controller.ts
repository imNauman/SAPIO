import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { clientIp } from '../../utils/request';
import { adminUserService } from './adminUser.service';
import { userActionSchema } from './admin.types';

/**
 * Admin user-management controller.
 *
 * Why: Maps the user lifecycle endpoints (search, detail, suspend, ban,
 * reactivate, delete, reset verification, reset password) to the service.
 * Every mutating action is audit-logged inside the service. `manage_users`
 * permission is enforced at the route layer via `requirePermission`.
 */
export const adminUserController = {
  /** GET /api/admin/users?q=&limit=&offset= */
  search: asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = Number(req.query.limit ?? 25);
    const offset = Number(req.query.offset ?? 0);
    const users = await adminUserService.searchUsers(q, limit, offset);
    sendSuccess(res, { users });
  }),

  /** GET /api/admin/users/:id */
  details: asyncHandler(async (req: Request, res: Response) => {
    const details = await adminUserService.getUser(req.params.id);
    sendSuccess(res, { user: details });
  }),

  /** PATCH /api/admin/users/:id/suspend */
  suspend: [
    validateBody(userActionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await adminUserService.suspendUser(
        req.admin!.id,
        req.params.id,
        req.body.reason,
        clientIp(req),
      );
      sendSuccess(res, { suspended: true });
    }),
  ],

  /** PATCH /api/admin/users/:id/ban */
  ban: [
    validateBody(userActionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await adminUserService.banUser(
        req.admin!.id,
        req.params.id,
        req.body.reason,
        clientIp(req),
      );
      sendSuccess(res, { banned: true });
    }),
  ],

  /** PATCH /api/admin/users/:id/reactivate */
  reactivate: [
    validateBody(userActionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      await adminUserService.reactivateUser(
        req.admin!.id,
        req.params.id,
        req.body.reason,
        clientIp(req),
      );
      sendSuccess(res, { reactivated: true });
    }),
  ],

  /** DELETE /api/admin/users/:id */
  remove: asyncHandler(async (req: Request, res: Response) => {
    await adminUserService.deleteUser(
      req.admin!.id,
      req.params.id,
      undefined,
      clientIp(req),
    );
    sendSuccess(res, { deleted: true });
  }),

  /** POST /api/admin/users/:id/reset-verification */
  resetVerification: asyncHandler(async (req: Request, res: Response) => {
    await adminUserService.resetVerification(
      req.admin!.id,
      req.params.id,
      undefined,
      clientIp(req),
    );
    sendSuccess(res, { reset: true });
  }),

  /** POST /api/admin/users/:id/reset-password */
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await adminUserService.resetPassword(
      req.admin!.id,
      req.params.id,
      undefined,
      clientIp(req),
    );
    sendSuccess(res, { resetEmailSent: true });
  }),
};
