import { create } from 'zustand';
import {
  superLikeApi,
  SuperLikeRecord,
  SuperLikeReceived,
} from '../lib/api/superlike.api';
import { featureUsageApi, FeatureUsage } from '../lib/api/featureusage.api';

/**
 * Super Like store (Zustand).
 *
 * Why: Single source of truth for the caller's Super Like state. `history` is
 * the sent list; `received` is the incoming list; `usage` carries the remaining
 * daily count (resolved server-side from subscription features). `send` performs
 * the action and refreshes usage. The feature gate + daily limit are enforced
 * server-side; this store only reflects state.
 */
interface SuperLikeState {
  history: SuperLikeRecord[];
  received: SuperLikeReceived[];
  usage: FeatureUsage | null;
  loading: boolean;
  error: string | null;

  /** Load sent history + received + remaining usage. */
  refresh: () => Promise<void>;
  /** Send a super like to a user. */
  send: (toUserId: string) => Promise<void>;
  /** Clear super like state (e.g. on logout). */
  clear: () => void;
}

export const useSuperLikeStore = create<SuperLikeState>((set) => ({
  history: [],
  received: [],
  usage: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [history, received, usage] = await Promise.all([
        superLikeApi.getHistory(),
        superLikeApi.getReceived(),
        featureUsageApi.getUsage('super_like'),
      ]);
      set({ history, received, usage, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load super likes',
      });
    }
  },

  send: async (toUserId: string) => {
    set({ loading: true, error: null });
    try {
      await superLikeApi.send(toUserId);
      const usage = await featureUsageApi.getUsage('super_like');
      set({ usage, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to super like',
      });
    }
  },

  clear: () =>
    set({ history: [], received: [], usage: null, loading: false, error: null }),
}));
