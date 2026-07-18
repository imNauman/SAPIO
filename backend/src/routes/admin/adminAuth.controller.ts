import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { adminAuthService } from './adminAuth.service';
import { adminLoginSchema } from './admin.types';

/**
 * Admin auth controller.
 *
 * Why: Thin HTTP ↔ service mapping for the separate admin login flow. The
 * returned access token is the same Supabase JWT used by `authenticate`, but
 * every downstream admin route additionally requires `requireAdmin` (RBAC).
 */
export const adminAuthController = {
  /** POST /api/admin/auth/login */
  login: [
    validateBody(adminLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await adminAuthService.login(req.body);
      sendSuccess(res, result, 200);
    }),
  ],

  /** GET /api/admin/profile — current admin principal. */
  profile: asyncHandler(async (req: Request, res: Response) => {
    const admin = await adminAuthService.getProfile(req.user!.id);
    sendSuccess(res, { admin });
  }),
};
