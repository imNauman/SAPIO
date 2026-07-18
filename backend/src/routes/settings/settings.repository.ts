import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { UserSettings } from './settings.types';
import { profileRepo } from '../profile/profile.repository';
import { notificationRepository } from '../notification/notification.repository';
import { recommendationRepository } from '../recommendation/recommendation.repository';
import { subscriptionRepository } from '../subscription/subscription.repository';

/**
 * Settings repository — the query layer for the Settings & Account Platform.
 *
 * Why: Owns raw Supabase access for `user_settings` and the account-lifecycle
 * mutations. Where another module already owns the data, we REUSE its
 * repository/service instead of re-querying:
 *   - profile (display name, verification, premium, discoverable, soft-delete)
 *     -> profileRepo
 *   - notification preferences + push tokens -> notificationRepository
 *   - discovery filters (age/distance/gender/goal) -> recommendationRepository
 *   - active subscription plan -> subscriptionRepository
 *   - password / email / session revocation -> authService (admin client)
 * This keeps a single source of truth and avoids duplicating business logic.
 */

const SETTINGS = 'user_settings';
const PROFILES = 'profiles';
const AUTH_USERS = 'auth.users';

interface SettingsRow {
  user_id: string;
  show_age: boolean;
  show_distance: boolean;
  show_online_status: boolean;
  show_last_seen: boolean;
  allow_messages_from_matches_only: boolean;
  discoverable: boolean;
  hide_verified_badge: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<SettingsRow, 'user_id'> = {
  show_age: true,
  show_distance: true,
  show_online_status: true,
  show_last_seen: true,
  allow_messages_from_matches_only: false,
  discoverable: true,
  hide_verified_badge: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function mapSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    showAge: row.show_age,
    showDistance: row.show_distance,
    showOnlineStatus: row.show_online_status,
    showLastSeen: row.show_last_seen,
    allowMessagesFromMatchesOnly: row.allow_messages_from_matches_only,
    discoverable: row.discoverable,
    hideVerifiedBadge: row.hide_verified_badge,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const settingsRepository = {
  /** Get a user's settings, returning defaults if no row exists yet. */
  async getSettings(
    client: SupabaseClient,
    userId: string,
  ): Promise<UserSettings> {
    const { data, error } = await client
      .from(SETTINGS)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) {
      return mapSettings({ user_id: userId, ...DEFAULT_SETTINGS });
    }
    return mapSettings(data as SettingsRow);
  },

  /** Upsert a user's settings (partial update). */
  async updateSettings(
    client: SupabaseClient,
    userId: string,
    input: Partial<{
      showAge: boolean;
      showDistance: boolean;
      showOnlineStatus: boolean;
      showLastSeen: boolean;
      allowMessagesFromMatchesOnly: boolean;
      discoverable: boolean;
      hideVerifiedBadge: boolean;
    }>,
  ): Promise<UserSettings> {
    const row: Record<string, unknown> = { user_id: userId };
    if (input.showAge !== undefined) row.show_age = input.showAge;
    if (input.showDistance !== undefined) row.show_distance = input.showDistance;
    if (input.showOnlineStatus !== undefined)
      row.show_online_status = input.showOnlineStatus;
    if (input.showLastSeen !== undefined) row.show_last_seen = input.showLastSeen;
    if (input.allowMessagesFromMatchesOnly !== undefined)
      row.allow_messages_from_matches_only = input.allowMessagesFromMatchesOnly;
    if (input.discoverable !== undefined) row.discoverable = input.discoverable;
    if (input.hideVerifiedBadge !== undefined)
      row.hide_verified_badge = input.hideVerifiedBadge;

    const { data, error } = await client
      .from(SETTINGS)
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new AppError(500, error.message);
    return mapSettings(data as SettingsRow);
  },

  /**
   * Soft-delete the account:
   *  - mark the profile `deleted_at` + `discoverable = false` (the Recommendation
   *    Engine excludes both, so the user vanishes from Discovery immediately)
   *  - set auth `status = deleted` in user_metadata (prevents future matches)
   *  - remove all push tokens (no further notifications)
   *  - terminate all sessions (global sign-out)
   * Rows are NOT hard-deleted: chats, reports, verification history and
   * subscription history remain for legal consistency.
   */
  async softDeleteAccount(
    client: SupabaseClient,
    userId: string,
  ): Promise<void> {
    // 1. Hide profile from discovery + mark deleted.
    const { error: pErr } = await client
      .from(PROFILES)
      .update({ discoverable: false, deleted_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (pErr) throw new AppError(500, pErr.message);

    // 2. Mark auth account status (drives match-prevention checks elsewhere).
    const { error: aErr } = await client.auth.admin.updateUserById(userId, {
      user_metadata: { status: 'deleted' },
    });
    if (aErr) throw new AppError(500, aErr.message);

    // 3. Remove push tokens.
    await notificationRepository.deleteDevices(client, userId);

    // 4. Terminate all sessions (global revoke).
    const { error: sErr } = await client.auth.admin.signOut(userId, 'global');
    if (sErr) {
      // Non-fatal: the profile is already hidden; log but don't fail the flow.
      // eslint-disable-next-line no-console
      console.warn('[settings] session revoke failed on delete:', sErr.message);
    }
  },

  /** Read auth user metadata (email, last sign-in, status). */
  async getAuthMeta(
    client: SupabaseClient,
    userId: string,
  ): Promise<{
    email: string | null;
    lastSignInAt: string | null;
    status: string;
  }> {
    const { data, error } = await client
      .from(AUTH_USERS)
      .select('email, last_sign_in_at, raw_user_meta_data')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    const u = data as {
      email: string | null;
      last_sign_in_at: string | null;
      raw_user_meta_data: { status?: string } | null;
    } | null;
    return {
      email: u?.email ?? null,
      lastSignInAt: u?.last_sign_in_at ?? null,
      status: u?.raw_user_meta_data?.status ?? 'active',
    };
  },
};

// Re-export so callers can reach the admin client if needed.
export { supabaseAdmin };

// Convenience bound helpers using the admin client (trusted server-side).
export const settingsRepo = {
  getSettings: (userId: string) =>
    settingsRepository.getSettings(supabaseAdmin, userId),
  updateSettings: (
    userId: string,
    input: Parameters<typeof settingsRepository.updateSettings>[2],
  ) => settingsRepository.updateSettings(supabaseAdmin, userId, input),
  softDeleteAccount: (userId: string) =>
    settingsRepository.softDeleteAccount(supabaseAdmin, userId),
  getAuthMeta: (userId: string) =>
    settingsRepository.getAuthMeta(supabaseAdmin, userId),
  // Re-export reused repositories so the service has one import surface.
  profileRepo,
  notificationRepository,
  recommendationRepository,
  subscriptionRepository,
};
