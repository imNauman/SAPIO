import { supabaseAdmin } from '../../config/supabase';
import { adminRepository } from './admin.repository';
import { verificationRepository } from '../verification/verification.repository';
import { VerificationStatus } from '../verification/verification.types';

/**
 * Admin verification service.
 *
 * Why: Reuses the existing `verificationRepository.transition` (which already
 * flips `profile.is_verified` and emits notification events) so the admin
 * decision path is identical to the future AI verifier path. No face
 * recognition is performed here — this is a manual human decision.
 */
export const adminVerificationService = {
  listQueue(limit = 50) {
    return adminRepository.listVerificationQueue(supabaseAdmin, limit);
  },

  async decide(
    adminId: string,
    requestId: string,
    status: VerificationStatus,
    opts: { rejectionReason?: string; ip?: string | null } = {},
  ) {
    const request = await verificationRepository.findById(
      supabaseAdmin,
      requestId,
    );
    if (!request) {
      throw new Error('Verification request not found');
    }
    const updated = await verificationRepository.transition(
      supabaseAdmin,
      requestId,
      request.status,
      status,
      {
        actorId: adminId,
        rejectionReason: opts.rejectionReason,
      },
    );
    await adminRepository.logActivity(supabaseAdmin, {
      adminId,
      action: `verification.${status}`,
      targetType: 'verification_request',
      targetId: requestId,
      metadata: { rejectionReason: opts.rejectionReason },
      ipAddress: opts.ip,
    });
    return updated;
  },
};
