import { apiClient } from '../apiClient';

/**
 * Notification API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/notifications` endpoints. The
 * mobile app sends the Supabase JWT via the `apiClient` interceptor. These
 * functions are the only place that knows about notification HTTP details — the
 * notification store calls these, keeping the UI decoupled from transport.
 * Push delivery itself is event-driven on the backend; this module only manages
 * the device token registration, the inbox, read state, and preferences.
 */

/** Allowed notification types (mirrors the backend enum). */
export type NotificationType =
  | 'new_match'
  | 'new_message'
  | 'verification_approved'
  | 'verification_rejected'
  | 'report_resolved';

/** Allowed device platforms. */
export type Platform = 'ios' | 'android' | 'web';

/** A persisted notification (inbox item). */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/** A registered device push token. */
export interface DeviceToken {
  id: string;
  userId: string;
  deviceToken: string;
  platform: Platform;
  deviceName: string | null;
  lastSeen: string;
  createdAt: string;
}

/** Per-user notification preferences. */
export interface NotificationPreference {
  userId: string;
  newMatch: boolean;
  newMessage: boolean;
  profileLike: boolean;
  verificationUpdates: boolean;
  marketing: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/** Body for POST /notifications/register-device. */
export interface RegisterDeviceInput {
  deviceToken: string;
  platform: Platform;
  deviceName?: string;
}

/** Body for PUT /notifications/preferences (all fields optional). */
export interface UpdatePreferencesInput {
  newMatch?: boolean;
  newMessage?: boolean;
  profileLike?: boolean;
  verificationUpdates?: boolean;
  marketing?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export const notificationApi = {
  /** POST /notifications/register-device */
  async registerDevice(input: RegisterDeviceInput): Promise<DeviceToken> {
    const { data } = await apiClient.post<{ data: { device: DeviceToken } }>(
      '/notifications/register-device',
      input,
    );
    return data.data.device;
  },

  /** GET /notifications — the caller's inbox. */
  async getNotifications(): Promise<Notification[]> {
    const { data } = await apiClient.get<{ data: { notifications: Notification[] } }>(
      '/notifications',
    );
    return data.data.notifications;
  },

  /** PATCH /notifications/read/:id — mark a notification read. */
  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/read/${id}`);
  },

  /** GET /notifications/preferences */
  async getPreferences(): Promise<NotificationPreference> {
    const { data } = await apiClient.get<{ data: { preferences: NotificationPreference } }>(
      '/notifications/preferences',
    );
    return data.data.preferences;
  },

  /** PUT /notifications/preferences */
  async updatePreferences(
    input: UpdatePreferencesInput,
  ): Promise<NotificationPreference> {
    const { data } = await apiClient.put<{ data: { preferences: NotificationPreference } }>(
      '/notifications/preferences',
      input,
    );
    return data.data.preferences;
  },
};
