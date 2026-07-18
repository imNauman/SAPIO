import { create } from 'zustand';
import {
  verificationApi,
  VerificationRequest,
  VerificationStatus,
  SelfieFile,
} from '../lib/api/verification.api';

/**
 * Verification store (Zustand).
 *
 * Why: Single source of truth for the user's verification state. `status`
 * derives from the active request (or 'not_started' when none). `refreshStatus`
 * loads the current request; `submit` uploads selfies and stores the new
 * request; `cancel` deletes the active request. All HTTP lives in
 * `verification.api`; this store is a thin state container. On approval the
 * backend sets `profile.is_verified = true` (the profile store owns that flag),
 * so this store only tracks the request lifecycle. AI verification is a future
 * plug-in and is not handled here.
 */

/** UI-facing status: the active request status, or 'not_started' if none. */
export type VerificationUiStatus = VerificationStatus | 'not_started';

interface VerificationState {
  request: VerificationRequest | null;
  status: VerificationUiStatus;
  loading: boolean;
  error: string | null;

  /** Load the caller's current active request (or null). */
  refreshStatus: () => Promise<void>;
  /** Upload selfies and create a verification request. */
  submit: (selfies: SelfieFile[]) => Promise<VerificationRequest>;
  /** Cancel the caller's own active request. */
  cancel: () => Promise<void>;
  /** Clear verification state (e.g. on logout). */
  clear: () => void;
}

function deriveStatus(request: VerificationRequest | null): VerificationUiStatus {
  return request ? request.status : 'not_started';
}

export const useVerificationStore = create<VerificationState>((set) => ({
  request: null,
  status: 'not_started',
  loading: false,
  error: null,

  refreshStatus: async () => {
    set({ loading: true, error: null });
    try {
      const request = await verificationApi.getStatus();
      set({ request, status: deriveStatus(request), loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load verification status',
      });
    }
  },

  submit: async (selfies) => {
    set({ loading: true, error: null });
    try {
      const request = await verificationApi.submit(selfies);
      set({ request, status: deriveStatus(request), loading: false });
      return request;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to submit verification',
      });
      throw e;
    }
  },

  cancel: async () => {
    set({ loading: true, error: null });
    try {
      await verificationApi.cancel();
      set({ request: null, status: 'not_started', loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to cancel verification',
      });
      throw e;
    }
  },

  clear: () =>
    set({ request: null, status: 'not_started', loading: false, error: null }),
}));
