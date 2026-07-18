import { supabaseAdmin } from '../../config/supabase';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { profileRepo } from '../profile/profile.repository';
import { BUCKET, photoRepository } from '../photo/photo.repository';
import { verificationRepository } from './verification.repository';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import {
  VerificationRequest,
  VerificationStatus,
} from './verification.types';

/** A selfie file uploaded by the client (multipart). */
export interface SelfieFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const MAX_SELFIES = 5;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Verification service.
 *
 * Why: Encapsulates the verification business rules. A user may have at most one
 * ACTIVE (pending/under_review) request — enforced by the partial unique index
 * (repository throws 409 on conflict) and re-checked here for a friendly 409.
 * Submitting creates the request + photos + initial history. Cancelling deletes
 * the user's own active request. On APPROVAL we flip profile.is_verified = true
 * (the recommendation engine already boosts verified users via its scoring
 * weight, and the badge is driven by profile.is_verified everywhere). Rejection
 * records a reason. The service is AI-ready: a future face-matching job can call
 * `transition` with a system actor id to approve/reject without UI changes.
 * No face recognition or government-ID logic is implemented.
 */
export const verificationService = {
  /** Get the caller's current active request (or null). */
  async getStatus(userId: string): Promise<VerificationRequest | null> {
    return verificationRepository.findActive(supabaseAdmin, userId);
  },

  /** Submit a new verification request (selfie photos). */
  async submit(
    userId: string,
    files: SelfieFile[],
  ): Promise<VerificationRequest> {
    if (!files || files.length === 0) {
      throw badRequest('At least one selfie is required');
    }
    if (files.length > MAX_SELFIES) {
      throw badRequest(`At most ${MAX_SELFIES} selfies are allowed`);
    }
    for (const f of files) {
      if (!ALLOWED_MIME.includes(f.mimetype)) {
        throw badRequest('Selfies must be JPEG, PNG, or WebP images');
      }
    }

    const existing = await verificationRepository.findActive(
      supabaseAdmin,
      userId,
    );
    if (existing) {
      throw conflict(
        'You already have an active verification request. Please wait for it to be reviewed.',
      );
    }

    // Upload each selfie to storage, then persist the request with photo URLs.
    const photos = await Promise.all(
      files.map(async (f, i) => {
        const storagePath = `verification/${userId}/${Date.now()}-${i}`;
        const { error } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(storagePath, f.buffer, {
            contentType: f.mimetype,
            upsert: false,
            cacheControl: '3600',
          });
        if (error) {
          throw new Error(`Selfie upload failed: ${error.message}`);
        }
        return { photoUrl: photoRepository.publicUrl(storagePath), photoType: 'selfie' as const };
      }),
    );

    return verificationRepository.create(supabaseAdmin, userId, photos);
  },

  /** Cancel the caller's own active request. */
  async cancel(userId: string): Promise<void> {
    const active = await verificationRepository.findActive(
      supabaseAdmin,
      userId,
    );
    if (!active) {
      throw notFound('No active verification request to cancel');
    }
    await verificationRepository.cancel(supabaseAdmin, userId, active.id);
  },

  /**
   * Transition a request's status. Used by manual moderation today and by an
   * AI verifier later. On approval we set profile.is_verified = true; on
   * rejection we leave it false. `actorId` is the moderator or system actor.
   */
  async transition(
    id: string,
    newStatus: VerificationStatus,
    opts: {
      actorId?: string | null;
      rejectionReason?: string | null;
    } = {},
  ): Promise<VerificationRequest> {
    const request = await verificationRepository.findById(supabaseAdmin, id);
    if (!request) {
      throw notFound('Verification request not found');
    }
    if (request.status === newStatus) {
      return request; // idempotent
    }
    if (
      newStatus === 'approved' &&
      (request.status === 'approved' ||
        request.status === 'rejected' ||
        request.status === 'expired')
    ) {
      throw badRequest(`Cannot move from ${request.status} to approved`);
    }

    const updated = await verificationRepository.transition(
      supabaseAdmin,
      id,
      request.status,
      newStatus,
      {
        reviewedBy: opts.actorId ?? null,
        rejectionReason: opts.rejectionReason,
      },
    );

    if (newStatus === 'approved') {
      await profileRepo.setVerified(request.userId, true);
      // Publish a domain event (notification module subscribes + delivers).
      emit(NOTIFICATION_EVENTS.VERIFICATION_APPROVED, {
        userId: request.userId,
      });
    } else if (newStatus === 'rejected') {
      emit(NOTIFICATION_EVENTS.VERIFICATION_REJECTED, {
        userId: request.userId,
        reason: opts.rejectionReason ?? null,
      });
    }
    return updated;
  },
};

// Re-export so callers can reach the repository if needed.
export { verificationRepository };
