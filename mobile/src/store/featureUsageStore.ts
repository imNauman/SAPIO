import { create } from 'zustand';
import { featureUsageApi, FeatureUsage } from '../lib/api/featureusage.api';

/**
 * Feature-usage store (Zustand).
 *
 * Why: Single source of truth for the caller's daily feature counters. Today
 * only `super_like` is tracked, but the store is keyed by feature so future
 * limited features drop in without changes. `refresh` loads the remaining count
 * for a given feature key. The limit is resolved server-side from subscription
 * features (Free = 0).
 */
interface FeatureUsageState {
  usage: Record<string, FeatureUsage>;
  loading: boolean;
  error: string | null;

  /** Load the usage (and remaining count) for a feature key. */
  refresh: (featureKey: string) => Promise<void>;
  /** Clear all usage state (e.g. on logout). */
  clear: () => void;
}

export const useFeatureUsageStore = create<FeatureUsageState>((set) => ({
  usage: {},
  loading: false,
  error: null,

  refresh: async (featureKey: string) => {
    set({ loading: true, error: null });
    try {
      const usage = await featureUsageApi.getUsage(featureKey);
      set((state) => ({
        usage: { ...state.usage, [featureKey]: usage },
        loading: false,
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load usage',
      });
    }
  },

  clear: () => set({ usage: {}, loading: false, error: null }),
}));
