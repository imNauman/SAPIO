import { apiClient } from '../apiClient';

/**
 * Verification API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/verification` endpoints. The
 * mobile app sends the Supabase JWT via the `apiClient` interceptor. These
 * functions are the only place that knows about verification HTTP details —
 * the verification store calls these, keeping the UI decoupled from transport.
 * Submitting uploads selfie images as multipart form-data (field `selfies`).
 * No face recognition or government-ID logic is implemented; the backend stores
 * the selfies for later (manual or future AI) review.
 */

/** Allowed verification statuses (server-managed). */
export type VerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

/** A single selfie photo attached to a verification request. */
export interface VerificationPhoto {
  id: string;
  verificationRequestId: string;
  photoUrl: string;
  photoType: 'selfie' | 'pose';
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

/** A verification request (mirrors the backend `VerificationRequest`). */
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

/** A local selfie file selected by the user, ready to upload. */
export interface SelfieFile {
  uri: string;
  name: string;
  type: string;
}

export const verificationApi = {
  /** POST /verification/submit — upload selfies (multipart). */
  async submit(selfies: SelfieFile[]): Promise<VerificationRequest> {
    const form = new FormData();
    selfies.forEach((s) => {
      form.append('selfies', {
        uri: s.uri,
        name: s.name,
        type: s.type,
      } as unknown as Blob);
    });
    const { data } = await apiClient.post<{
      data: { request: VerificationRequest };
    }>('/verification/submit', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.request;
  },

  /** GET /verification/status — the caller's current active request (or null). */
  async getStatus(): Promise<VerificationRequest | null> {
    const { data } = await apiClient.get<{
      data: { request: VerificationRequest | null };
    }>('/verification/status');
    return data.data.request;
  },

  /** DELETE /verification/request — cancel the caller's own active request. */
  async cancel(): Promise<void> {
    await apiClient.delete('/verification/request');
  },
};
