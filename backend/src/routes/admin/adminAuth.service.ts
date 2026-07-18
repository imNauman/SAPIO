import { supabaseAdmin, supabaseAnon } from '../../config/supabase';
import { AppError, unauthorized } from '../../utils/errors';
import { authService } from '../auth/auth.service';
import { adminRepository } from './admin.repository';
import { AdminLoginInput, AdminUser } from './admin.types';

/**
 * Admin auth service.
 *
 * Why: Admin login reuses the SAME Supabase email/password flow as end users
 * (`authService.signIn`) — there is no separate auth system. The difference is
 * that after login we verify the authenticated user is a registered, active
 * admin. This keeps one auth provider while enforcing RBAC at the API boundary.
 */
export const adminAuthService = {
  /**
   * Authenticate an admin. Returns the Supabase session (access token) plus the
   * resolved admin principal. Throws 401 when credentials are wrong and 403
   * when the user is not an authorized admin.
   */
  async login(input: AdminLoginInput): Promise<{
    admin: AdminUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const result = await authService.signIn(input.email, input.password);
    if (!result.user || !result.session) {
      throw unauthorized('Invalid admin credentials');
    }

    const admin = await adminRepository.getAdminByUserId(
      supabaseAdmin,
      result.user.id,
    );
    if (!admin) {
      throw unauthorized('Your account is not authorized for admin access');
    }
    if (!admin.isActive) {
      throw new AppError(403, 'This admin account has been deactivated');
    }

    await adminRepository.touchLogin(supabaseAdmin, admin.id);

    return {
      admin,
      accessToken: result.session.accessToken,
      refreshToken: result.session.refreshToken,
    };
  },

  /** Resolve the current admin from a verified JWT (used by GET /profile). */
  async getProfile(adminUserId: string): Promise<AdminUser> {
    const admin = await adminRepository.getAdminByUserId(
      supabaseAdmin,
      adminUserId,
    );
    if (!admin) {
      throw unauthorized('Admin session is no longer valid');
    }
    return admin;
  },
};

// Re-export so callers can reach the anon client if needed.
export { supabaseAnon };
