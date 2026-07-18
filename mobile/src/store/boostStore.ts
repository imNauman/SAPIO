import { create } from 'zustand';
import { boostApi, BoostSession } from '../lib/api/boost.api';

/**
 * Boost store (Zustand).
 *
 * Why: Single source of truth for the caller's active boost. `boost` holds the
 * current session (or null); `refresh` loads status; `start` triggers a boost
 * and updates state. The countdown is derived from `expiresAt` in the UI. The
 * `boost` feature gate is enforced server-side; this store only reflects state.
 */
interface BoostState {
  boost: BoostSession | null;
  loading: boolean;
  error: string | null;

  /** Load the caller's active boost. */
  refresh: () => Promise<void>;
  /** Start a new boost. */
  start: () => Promise<void>;
  /** Clear boost state (e.g. on logout). */
  clear: () => void;
}

export const useBoostStore = create<BoostState>((set) => ({
  boost: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const boost = await boostApi.getStatus();
      set({ boost, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load boost',
      });
    }
  },

  start: async () => {
    set({ loading: true, error: null });
    try {
      const boost = await boostApi.start();
      set({ boost, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to start boost',
      });
    }
  },

  clear: () => set({ boost: null, loading: false, error: null }),
}));
