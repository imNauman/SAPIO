import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  DeviceToken,
  Notification,
  NotificationPreference,
  NotificationType,
  Platform,
  RegisterDeviceInput,
  UpdatePreferencesInput,
} from './notification.types';

/**
 * Notification repository.
 *
 * Why: Isolates all raw Supabase queries for the three notification tables
 * behind a typed interface. Uses the admin client (server-side) so the service
 * can read/write regardless of RLS, while RLS still protects direct client
 * access. snake_case <-> camelCase mapping happens here at the boundary.
 */

const TOKENS = 'device_tokens';
const NOTIFS = 'notifications';
const PREFS = 'notification_preferences';

interface DeviceTokenRow {
  id: string;
  user_id: string;
  device_token: string;
  platform: Platform;
  device_name: string | null;
  last_seen: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface PreferenceRow {
  user_id: string;
  new_match: boolean;
  new_message: boolean;
  profile_like: boolean;
  verification_updates: boolean;
  marketing: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

/** Default preferences used when a user has no row yet. */
const DEFAULT_PREFERENCES: Omit<PreferenceRow, 'user_id'> = {
  new_match: true,
  new_message: true,
  profile_like: true,
  verification_updates: true,
  marketing: false,
  email_notifications: false,
  push_notifications: true,
};

function isDuplicateKey(err: unknown): boolean {
  return (
    err instanceof Error &&
    /duplicate key value violates unique constraint/i.test(err.message)
  );
}

function isMissingTable(err: unknown): boolean {
  return (
    err instanceof Error && /relation .* does not exist/i.test(err.message)
  );
}

function mapToken(row: DeviceTokenRow): DeviceToken {
  return {
    id: row.id,
    userId: row.user_id,
    deviceToken: row.device_token,
    platform: row.platform,
    deviceName: row.device_name,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

function mapPreference(row: PreferenceRow): NotificationPreference {
  return {
    userId: row.user_id,
    newMatch: row.new_match,
    newMessage: row.new_message,
    profileLike: row.profile_like,
    verificationUpdates: row.verification_updates,
    marketing: row.marketing,
    emailNotifications: row.email_notifications,
    pushNotifications: row.push_notifications,
  };
}

export const notificationRepository = {
  /**
   * Upsert a device token for a user. On conflict of (user_id, device_token)
   * we refresh last_seen (and platform/name) so re-registration is idempotent.
   */
  async upsertDeviceToken(
    client: SupabaseClient,
    userId: string,
    input: RegisterDeviceInput,
  ): Promise<DeviceToken> {
    const row = {
      user_id: userId,
      device_token: input.deviceToken,
      platform: input.platform,
      device_name: input.deviceName ?? null,
      last_seen: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(TOKENS)
      .upsert(row, { onConflict: 'user_id,device_token' })
      .select()
      .single();
    if (error) {
      if (isDuplicateKey(error)) {
        // Race on insert; fetch the existing row instead.
        const { data: existing, error: e2 } = await client
          .from(TOKENS)
          .select()
          .eq('user_id', userId)
          .eq('device_token', input.deviceToken)
          .maybeSingle();
        if (existing) return mapToken(existing as DeviceTokenRow);
        throw new AppError(500, e2?.message ?? 'Failed to register device');
      }
      throw new AppError(500, error.message);
    }
    return mapToken(data as DeviceTokenRow);
  },

  /** Return the raw push tokens for a user (used by the dispatcher). */
  async listDevices(client: SupabaseClient, userId: string): Promise<string[]> {
    const { data, error } = await client
      .from(TOKENS)
      .select('device_token')
      .eq('user_id', userId);
    if (error) throw new AppError(500, error.message);
    return (data as { device_token: string }[]).map((r) => r.device_token);
  },

  /** Remove all push tokens for a user (logout / account deletion). */
  async deleteDevices(client: SupabaseClient, userId: string): Promise<void> {
    const { error } = await client
      .from(TOKENS)
      .delete()
      .eq('user_id', userId);
    if (error) throw new AppError(500, error.message);
  },

  /** List a user's notifications, newest first. */
  async listNotifications(
    client: SupabaseClient,
    userId: string,
    limit = 50,
  ): Promise<Notification[]> {
    const { data, error } = await client
      .from(NOTIFS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return (data as NotificationRow[]).map(mapNotification);
  },

  /** Insert a notification row (always unread). */
  async insertNotification(
    client: SupabaseClient,
    input: {
      userId: string;
      type: NotificationType;
      title: string;
      body: string;
      payload: Record<string, unknown> | null;
    },
  ): Promise<Notification> {
    const { data, error } = await client
      .from(NOTIFS)
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload,
        is_read: false,
      })
      .select()
      .single();
    if (error) throw new AppError(500, error.message);
    return mapNotification(data as NotificationRow);
  },

  /** Mark a single notification read (owner-scoped). */
  async markRead(
    client: SupabaseClient,
    userId: string,
    id: string,
  ): Promise<boolean> {
    const { error } = await client
      .from(NOTIFS)
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new AppError(500, error.message);
    return true;
  },

  /** Get a user's preferences, returning defaults if no row exists. */
  async getPreferences(
    client: SupabaseClient,
    userId: string,
  ): Promise<NotificationPreference> {
    const { data, error } = await client
      .from(PREFS)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) {
      return mapPreference({ user_id: userId, ...DEFAULT_PREFERENCES });
    }
    return mapPreference(data as PreferenceRow);
  },

  /** Upsert a user's preferences (partial update). */
  async upsertPreferences(
    client: SupabaseClient,
    userId: string,
    input: UpdatePreferencesInput,
  ): Promise<NotificationPreference> {
    const row: Record<string, unknown> = { user_id: userId };
    if (input.newMatch !== undefined) row.new_match = input.newMatch;
    if (input.newMessage !== undefined) row.new_message = input.newMessage;
    if (input.profileLike !== undefined) row.profile_like = input.profileLike;
    if (input.verificationUpdates !== undefined)
      row.verification_updates = input.verificationUpdates;
    if (input.marketing !== undefined) row.marketing = input.marketing;
    if (input.emailNotifications !== undefined)
      row.email_notifications = input.emailNotifications;
    if (input.pushNotifications !== undefined)
      row.push_notifications = input.pushNotifications;

    const { data, error } = await client
      .from(PREFS)
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new AppError(500, error.message);
    return mapPreference(data as PreferenceRow);
  },
};

// Re-export so callers can reach the admin client if needed.
export { supabaseAdmin, isMissingTable };
