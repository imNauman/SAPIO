import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { clientIp } from '../../utils/request';
import { adminRoleService } from './adminRole.service';
import { assignRoleSchema } from './admin.types';

/**
 * Admin role-management controller.
 *
 * Why: Lists roles/permissions/admins and reassigns an admin's role. Creating
 * new admins is gated behind `manage_admins`. Role/permission *definitions* are
 * seeded and immutable in this milestone. Guarded by `manage_admins` (except
 * the read-only list endpoints, which require `view_analytics`).
 */
export const adminRoleController = {
  /** GET /api/admin/roles */
  listRoles: asyncHandler(async (_req: Request, res: Response) => {
    const roles = await adminRoleService.listRoles();
    sendSuccess(res, { roles });
  }),

  /** GET /api/admin/permissions */
  listPermissions: asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await adminRoleService.listPermissions();
    sendSuccess(res, { permissions });
  }),

  /** GET /api/admin/admins */
  listAdmins: asyncHandler(async (_req: Request, res: Response) => {
    const admins = await adminRoleService.listAdmins();
    sendSuccess(res, { admins });
  }),

  /** POST /api/admin/admins/:id/role */
  assignRole: [
    validateBody(assignRoleSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const updated = await adminRoleService.assignRole(
        req.admin!.id,
        req.params.id,
        req.body.roleId,
        clientIp(req),
      );
      sendSuccess(res, { admin: updated });
    }),
  ],
};
