import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';
import { AdminUser } from './admin.types';

/**
 * Admin role-management service.
 *
 * Why: Lists roles/permissions and reassigns an admin's role. Creating new
 * admins is intentionally gated behind `manage_admins` and performed via the
 * auth + admin repositories. Role/permission *definitions* are seeded and
 * immutable in this milestone (no UI to edit the matrix).
 */
export const adminRoleService = {
  listRoles() {
    return adminRepository.listRoles(supabaseAdmin);
  },

  listPermissions() {
    return adminRepository.listPermissions(supabaseAdmin);
  },

  listAdmins() {
    return adminRepository.listAdmins(supabaseAdmin);
  },

  async assignRole(
    adminId: string,
    targetAdminId: string,
    roleId: string,
    ip?: string | null,
  ): Promise<AdminUser> {
    const updated = await adminRepository.updateAdminRole(
      supabaseAdmin,
      targetAdminId,
      roleId,
    );
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'admin.assign_role',
      targetType: 'admin',
      targetId: targetAdminId,
      metadata: { roleId },
      ipAddress: ip,
    });
    return updated;
  },
};
