import { create } from 'zustand';
import {
  notificationApi,
  Notification,
  NotificationPreference,
  RegisterDeviceInput,
  UpdatePreferencesInput,
} from '../lib/api/notification.api';

/**
 * Notification store (Zustand).
 *
 * Why: Single source of truth for the user's notification inbox and preferences.
 * `notifications` powers `NotificationCenterScreen`; `preferences` powers
 * `NotificationSettingsScreen`. All HTTP lives in `notification.api`; this store
 * is a thin state container. Push token registration is triggered from the FCM
 * bootstrap (`lib/fcm`), not from the UI directly.
 */
interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreference | null;
  loading: boolean;
  error: string | null;

  /** Register the device push token with the backend. */
  registerDevice: (input: RegisterDeviceInput) => Promise<void>;
  /** Load the caller's notifications. */
  refreshNotifications: () => Promise<void>;
  /** Mark a notification read and update local state. */
  markRead: (id: string) => Promise<void>;
  /** Load the caller's preferences. */
  refreshPreferences: () => Promise<void>;
  /** Update preferences and merge the result locally. */
  updatePreferences: (input: UpdatePreferencesInput) => Promise<void>;
  /** Clear all notification state (e.g. on logout). */
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  preferences: null,
  loading: false,
  error: null,

  registerDevice: async (input) => {
    try {
      await notificationApi.registerDevice(input);
    } catch (e) {
      // Token registration failures are non-fatal; surface but don't block.
      set({ error: e instanceof Error ? e.message : 'Failed to register device' });
    }
  },

  refreshNotifications: async () => {
    set({ loading: true, error: null });
    try {
      const notifications = await notificationApi.getNotifications();
      set({ notifications, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load notifications',
      });
    }
  },

  markRead: async (id) => {
    try {
      await notificationApi.markRead(id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to mark read' });
      return;
    }
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    }));
  },

  refreshPreferences: async () => {
    set({ loading: true, error: null });
    try {
      const preferences = await notificationApi.getPreferences();
      set({ preferences, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load preferences',
      });
    }
  },

  updatePreferences: async (input) => {
    set({ loading: true, error: null });
    try {
      const preferences = await notificationApi.updatePreferences(input);
      set({ preferences, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to update preferences',
      });
    }
  },

  clear: () =>
    set({ notifications: [], preferences: null, loading: false, error: null }),
}));
