import { create } from 'zustand';
import { settingsApi } from '../lib/api/settings.api';
import {
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  SettingsBundle,
  UpdateSettingsInput,
  UserSettings,
} from '../lib/api/settings.api';
import { useAuthStore } from './authStore';
import { useProfileStore } from './profileStore';
import { usePhotoStore } from './photoStore';
import { useNotificationStore } from './notificationStore';
import { useRecommendationStore } from './recommendationStore';
import { useChatStore } from './chatStore';
import { useMatchStore } from './matchStore';
import { useBlockStore } from './blockStore';
import { useReportStore } from './reportStore';
import { useBoostStore } from './boostStore';
import { useSuperLikeStore } from './superLikeStore';
import { useSubscriptionStore } from './subscriptionStore';
import { useVerificationStore } from './verificationStore';
import { useFeatureUsageStore } from './featureUsageStore';
import { useSwipeStore } from './swipeStore';
import { useDiscoveryStore } from './discoveryStore';

/**
 * Settings & Account store (Zustand).
 *
 * Why: Centralizes the settings bundle and account-lifecycle actions so screens
 * stay thin. It reuses the existing stores rather than duplicating their logic:
 *   - notification preferences -> useNotificationStore
 *   - discovery preferences     -> useRecommendationStore
 *   - logout                    -> useAuthStore.logout (invalidates the refresh
 *                                  token via Supabase) + clears every cached
 *                                  store so no user data lingers on device.
 */
interface SettingsState {
  bundle: SettingsBundle | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (input: UpdateSettingsInput) => Promise<UserSettings>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  changeEmail: (input: ChangeEmailInput) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (input: DeleteAccountInput) => Promise<void>;
  clear: () => void;
}

/** Wipe every cached store so no user data remains after logout/delete. */
function clearAllStores(): void {
  useProfileStore.getState().clear();
  usePhotoStore.getState().clear();
  useNotificationStore.getState().clear();
  useRecommendationStore.getState().clear();
  useChatStore.getState().clear();
  useMatchStore.getState().clear();
  useBlockStore.getState().clear();
  useReportStore.getState().clear();
  useBoostStore.getState().clear();
  useSuperLikeStore.getState().clear();
  useSubscriptionStore.getState().clear();
  useVerificationStore.getState().clear();
  useFeatureUsageStore.getState().clear();
  useSwipeStore.getState().clear();
  useDiscoveryStore.getState().clear();
}

export const useSettingsStore = create<SettingsState>((set) => ({
  bundle: null,
  loading: false,
  saving: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const bundle = await settingsApi.getSettings();
      set({ bundle, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  updateSettings: async (input: UpdateSettingsInput) => {
    set({ saving: true, error: null });
    try {
      const settings = await settingsApi.updateSettings(input);
      set((s) => ({
        saving: false,
        bundle: s.bundle ? { ...s.bundle, settings } : s.bundle,
      }));
      return settings;
    } catch (e) {
      set({ error: (e as Error).message, saving: false });
      throw e;
    }
  },

  changePassword: async (input: ChangePasswordInput) => {
    set({ saving: true, error: null });
    try {
      await settingsApi.changePassword(input);
      set({ saving: false });
    } catch (e) {
      set({ error: (e as Error).message, saving: false });
      throw e;
    }
  },

  changeEmail: async (input: ChangeEmailInput) => {
    set({ saving: true, error: null });
    try {
      await settingsApi.changeEmail(input);
      set({ saving: false });
    } catch (e) {
      set({ error: (e as Error).message, saving: false });
      throw e;
    }
  },

  logout: async () => {
    // Invalidate the refresh token on the backend + clear Supabase session.
    await useAuthStore.getState().logout();
    // Wipe every cached store (authStore already clears profile + photo).
    clearAllStores();
    set({ bundle: null, error: null });
  },

  deleteAccount: async (input: DeleteAccountInput) => {
    set({ saving: true, error: null });
    try {
      await settingsApi.deleteAccount(input);
      // Account is soft-deleted server-side (sessions already revoked). The
      // client signOut may fail because the session is already invalid, so we
      // tolerate it and just clear local state.
      try {
        await useAuthStore.getState().logout();
      } catch {
        /* session already revoked server-side */
      }
      clearAllStores();
      set({ bundle: null, saving: false, error: null });
    } catch (e) {
      set({ error: (e as Error).message, saving: false });
      throw e;
    }
  },

  clear: () => set({ bundle: null, loading: false, saving: false, error: null }),
}));
