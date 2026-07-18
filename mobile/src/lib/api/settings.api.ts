import { apiClient } from '../apiClient';

/**
 * Settings & Account API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/settings` and `/api/account`
 * endpoints. The mobile app sends the Supabase JWT via the `apiClient`
 * interceptor. These functions are the only place that knows about settings
 * HTTP details — the settings store calls these, keeping the UI decoupled from
 * transport. Notification and discovery preferences are reused from their own
 * API modules; this module only owns the privacy toggles and account lifecycle.
 */

/** Privacy toggles (mirrors `user_settings` on the backend). */
export interface UserSettings {
  userId: string;
  showAge: boolean;
  showDistance: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowMessagesFromMatchesOnly: boolean;
  discoverable: boolean;
  hideVerifiedBadge: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Notification preferences (reused from the Notification Platform). */
export interface NotificationPreferences {
  newMatch: boolean;
  newMessage: boolean;
  profileLike: boolean;
  verificationUpdates: boolean;
  marketing: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

/** Discovery preferences (reused from the Recommendation Engine). */
export interface DiscoveryPreferences {
  minimumAge: number;
  maximumAge: number;
  maximumDistanceKm: number;
  interestedIn: string[];
  relationshipGoal: string | null;
  showVerifiedOnly: boolean;
  showOnlineOnly: boolean;
  hideInactiveUsers: boolean;
  preferredLanguages: string[];
}

/** Account summary (email, verification, premium, subscription, status). */
export interface AccountSummary {
  email: string | null;
  isVerified: boolean;
  isPremium: boolean;
  subscriptionPlan: string | null;
  lastSignInAt: string | null;
  accountStatus: string;
}

/** The full bundle the Settings screen renders. */
export interface SettingsBundle {
  settings: UserSettings;
  notifications: NotificationPreferences;
  discovery: DiscoveryPreferences;
  account: AccountSummary;
}

/** Body for PATCH /settings. */
export interface UpdateSettingsInput {
  showAge?: boolean;
  showDistance?: boolean;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  allowMessagesFromMatchesOnly?: boolean;
  discoverable?: boolean;
  hideVerifiedBadge?: boolean;
}

/** Body for PATCH /account/password. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Body for PATCH /account/email. */
export interface ChangeEmailInput {
  newEmail: string;
  password: string;
}

/** Body for DELETE /account. */
export interface DeleteAccountInput {
  password: string;
}

export const settingsApi = {
  /** GET /settings — the full settings bundle. */
  async getSettings(): Promise<SettingsBundle> {
    const { data } = await apiClient.get<{ data: { settings: SettingsBundle } }>(
      '/settings',
    );
    return data.data.settings;
  },

  /** PATCH /settings — update privacy toggles. */
  async updateSettings(input: UpdateSettingsInput): Promise<UserSettings> {
    const { data } = await apiClient.patch<{ data: { settings: UserSettings } }>(
      '/settings',
      input,
    );
    return data.data.settings;
  },

  /** PATCH /account/password. */
  async changePassword(input: ChangePasswordInput): Promise<void> {
    await apiClient.patch('/account/password', input);
  },

  /** PATCH /account/email. */
  async changeEmail(input: ChangeEmailInput): Promise<void> {
    await apiClient.patch('/account/email', input);
  },

  /** DELETE /account — soft delete. */
  async deleteAccount(input: DeleteAccountInput): Promise<void> {
    await apiClient.delete('/account', { data: input });
  },
};
