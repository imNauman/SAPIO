import { supabaseAdmin } from '../../config/supabase';
import { notificationRepository } from './notification.repository';
import { notificationDispatcher } from './notification.dispatcher';
import {
  DeviceToken,
  Notification,
  NotificationPreference,
  NotificationType,
  RegisterDeviceInput,
  UpdatePreferencesInput,
} from './notification.types';

/**
 * Notification service.
 *
 * Why: The single entry point for creating and delivering notifications. It is
 * the ONLY module allowed to call the dispatcher / Firebase. Business modules
 * never call this directly — they emit domain EVENTS (see eventBus) which the
 * notification subscriber turns into `createAndDispatch` calls. This service
 * applies per-user preferences (gating) and persists an inbox row before
 * dispatching to push. Future channels (Email/SMS) slot in by adding a dispatch
 * call here guarded by the relevant preference.
 */
export const notificationService = {
  /**
   * Create a notification (persisted, unread) and dispatch it to the user's
   * registered push devices, honoring their preferences.
   *
   * Gating rules:
   *  - `push_notifications` must be true (master switch for the push channel).
   *  - type-specific prefs gate their category:
   *      new_match            -> newMatch
   *      new_message          -> newMessage
   *      verification_approved -> verificationUpdates
   *      verification_rejected -> verificationUpdates
   *      report_resolved      -> (only push_notifications; no dedicated pref)
   *  - `marketing` is never sent here (out of scope).
   */
  async createAndDispatch(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: Record<string, unknown> | null;
  }): Promise<Notification | null> {
    const prefs = await notificationRepository.getPreferences(
      supabaseAdmin,
      input.userId,
    );

    // Master push switch.
    if (!prefs.pushNotifications) return null;

    // Per-type gating.
    if (input.type === 'new_match' && !prefs.newMatch) return null;
    if (input.type === 'new_message' && !prefs.newMessage) return null;
    if (
      (input.type === 'verification_approved' ||
        input.type === 'verification_rejected') &&
      !prefs.verificationUpdates
    )
      return null;

    // Persist the inbox entry (always, regardless of device presence).
    const notification = await notificationRepository.insertNotification(
      supabaseAdmin,
      {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload ?? null,
      },
    );

    // Dispatch to push devices (best-effort; failures are logged, not fatal).
    const tokens = await notificationRepository.listDevices(
      supabaseAdmin,
      input.userId,
    );
    if (tokens.length > 0) {
      await notificationDispatcher.dispatchPush(notification, tokens);
    }

    return notification;
  },

  /** Register (upsert) a device push token for the current user. */
  async registerDevice(
    userId: string,
    input: RegisterDeviceInput,
  ): Promise<DeviceToken> {
    return notificationRepository.upsertDeviceToken(supabaseAdmin, userId, input);
  },

  /** List the current user's notifications (newest first). */
  async listForUser(userId: string, limit = 50): Promise<Notification[]> {
    return notificationRepository.listNotifications(supabaseAdmin, userId, limit);
  },

  /** Mark a notification read. */
  async markRead(userId: string, id: string): Promise<boolean> {
    return notificationRepository.markRead(supabaseAdmin, userId, id);
  },

  /** Get the current user's preferences. */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    return notificationRepository.getPreferences(supabaseAdmin, userId);
  },

  /** Update the current user's preferences. */
  async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput,
  ): Promise<NotificationPreference> {
    return notificationRepository.upsertPreferences(
      supabaseAdmin,
      userId,
      input,
    );
  },
};
