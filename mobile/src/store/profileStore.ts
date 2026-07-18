import { create } from 'zustand';
import {
  Profile,
  ProfileInput,
  LocationInput,
  profileApi,
} from '../lib/api/profile.api';

/**
 * Profile store (Zustand).
 *
 * Why: Single source of truth for the current user's profile. Screens read
 * `profile` / `loading` and call `fetchProfile` / `updateProfile` /
 * `refreshProfile`. Business logic (HTTP) lives in `profile.api`, keeping the
 * store a thin state container. `createProfile` is an alias of `updateProfile`
 * that the Create screen uses once a profile exists server-side.
 */
interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;

  /** Load the authenticated user's profile (no-op-safe if already loaded). */
  fetchProfile: () => Promise<void>;
  /** Create or update the user's profile. */
  updateProfile: (input: ProfileInput) => Promise<void>;
  /** Re-fetch the latest profile from the server. */
  refreshProfile: () => Promise<void>;
  /** Patch only the location. */
  updateLocation: (input: LocationInput) => Promise<void>;
  /** Clear profile state (e.g. on logout). */
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await profileApi.getMe();
      set({ profile, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load profile',
      });
    }
  },

  updateProfile: async (input) => {
    set({ loading: true, error: null });
    try {
      // PUT creates if absent, PATCH updates if present. We try update first,
      // falling back to create on a 404 to keep the UI simple.
      let profile: Profile;
      try {
        profile = await profileApi.update(input);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('404') || message.toLowerCase().includes('not found')) {
          profile = await profileApi.create(input);
        } else {
          throw err;
        }
      }
      set({ profile, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to save profile',
      });
      throw e;
    }
  },

  refreshProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await profileApi.getMe();
      set({ profile, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to refresh profile',
      });
    }
  },

  updateLocation: async (input) => {
    set({ loading: true, error: null });
    try {
      const profile = await profileApi.updateLocation(input);
      set({ profile, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to update location',
      });
    }
  },

  clear: () => set({ profile: null, loading: false, error: null }),
}));
