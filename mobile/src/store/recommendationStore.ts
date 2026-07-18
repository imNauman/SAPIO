import { create } from 'zustand';
import {
  recommendationApi,
  UserPreferences,
  UpdatePreferencesInput,
} from '../lib/api/recommendation.api';

/**
 * Recommendation preferences store (Zustand).
 *
 * Why: Single source of truth for the caller's discovery preferences (age range,
 * distance, gender, relationship goal, verified/online/inactive filters). The
 * preferences are owned by the backend Recommendation Engine; this store only
 * caches them and exposes load/save actions. Saving preferences invalidates the
 * engine's cached feed (handled server-side), so the deck should be refreshed
 * afterwards by the caller.
 */
interface RecommendationState {
  preferences: UserPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  /** Load current preferences (defaults are applied server-side). */
  loadPreferences: () => Promise<void>;
  /** Persist preference changes. */
  updatePreferences: (input: UpdatePreferencesInput) => Promise<void>;
  /** Clear state (e.g. on logout). */
  clear: () => void;
}

export const useRecommendationStore = create<RecommendationState>(
  (set) => ({
    preferences: null,
    loading: false,
    saving: false,
    error: null,

    loadPreferences: async () => {
      set({ loading: true, error: null });
      try {
        const preferences = await recommendationApi.getPreferences();
        set({ preferences, loading: false });
      } catch (e) {
        set({
          loading: false,
          error:
            e instanceof Error ? e.message : 'Failed to load preferences',
        });
      }
    },

    updatePreferences: async (input) => {
      set({ saving: true, error: null });
      try {
        const preferences = await recommendationApi.updatePreferences(input);
        set({ preferences, saving: false });
      } catch (e) {
        set({
          saving: false,
          error:
            e instanceof Error ? e.message : 'Failed to save preferences',
        });
        throw e;
      }
    },

    clear: () => set({ preferences: null, loading: false, saving: false, error: null }),
  }),
);
