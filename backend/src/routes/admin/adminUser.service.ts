import { supabaseAdmin } from '../../config/supabase';
import { notFound } from '../../utils/errors';
import { adminRepository } from './admin.repository';
import { AdminUser } from './admin.types';

/**
 * Admin user-management service.
 *
 * Why: Every mutating action is wrapped in an audit-log write so the activity
 * trail is complete. Business logic for profiles/verification is delegated to
 * the existing repositories (profileRepo, verificationRepository) — never
 * duplicated here.
 */
export const adminUserService = {
  async searchUsers(query: string, limit = 25, offset = 0) {
    return adminRepository.searchUsers(supabaseAdmin, query, limit, offset);
  },

  async getUser(userId: string) {
    const details = await adminRepository.getUserDetails(supabaseAdmin, userId);
    if (!details.profile && !details.email) {
      throw notFound('User not found');
    }
    return details;
  },

  async suspendUser(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    await adminRepository.setUserStatus(supabaseAdmin, userId, 'suspended');
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.suspend',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },

  async banUser(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    await adminRepository.setUserStatus(supabaseAdmin, userId, 'banned');
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.ban',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },

  async reactivateUser(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    await adminRepository.setUserStatus(supabaseAdmin, userId, 'active');
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.reactivate',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },

  async deleteUser(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    await adminRepository.deleteUser(supabaseAdmin, userId);
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.delete',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },

  async resetVerification(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    await adminRepository.resetVerification(supabaseAdmin, userId);
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.reset_verification',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },

  /**
   * Placeholder for password reset. We do NOT manage passwords directly; we
   * trigger Supabase's secure reset-email flow on behalf of the user.
   */
  async resetPassword(
    adminId: string,
    userId: string,
    reason?: string,
    ip?: string | null,
  ) {
    const details = await adminRepository.getUserDetails(supabaseAdmin, userId);
    if (!details.email) {
      throw notFound('User has no email on record');
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      details.email,
    );
    if (error) {
      throw new Error(error.message);
    }
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: 'user.reset_password',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
      ipAddress: ip,
    });
  },
};

// Re-export for convenience.
export type { AdminUser };
