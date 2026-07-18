/**
 * Verification domain types.
 *
 * Why: A verification request is a selfie-based attestation that the account
 * belongs to a real person. The workflow is Pending → Under Review →
 * Approved/Rejected (or Expired). Only one ACTIVE (pending/under_review)
 * request per user is allowed (enforced by a partial unique index in migration
 * 0010 and mirrored here as a 409). On approval the service flips
 * profile.is_verified = true. The schema is AI-ready: a future face-matching
 * job can read verification_photos and update status without structural change.
 * No face recognition or government-ID logic is implemented.
 */

/** Allowed verification statuses (server-managed). */
export const VERIFICATION_STATUSES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'expired',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Allowed selfie photo types. */
export const VERIFICATION_PHOTO_TYPES = ['selfie', 'pose'] as const;
export type VerificationPhotoType = (typeof VERIFICATION_PHOTO_TYPES)[number];

/** A single selfie photo attached to a verification request. */
export interface VerificationPhoto {
  id: string;
  verificationRequestId: string;
  photoUrl: string;
  photoType: VerificationPhotoType;
  createdAt: string;
}

/** A status-change audit entry. */
export interface VerificationStatusHistoryEntry {
  id: string;
  verificationRequestId: string;
  oldStatus: VerificationStatus | null;
  newStatus: VerificationStatus;
  changedAt: string;
  changedBy: string | null;
}

/** A verification request (server shape). */
export interface VerificationRequest {
  id: string;
  userId: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  photos: VerificationPhoto[];
  history: VerificationStatusHistoryEntry[];
}
