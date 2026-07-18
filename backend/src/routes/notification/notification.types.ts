import { z } from 'zod';

/**
 * Notification domain types + validation.
 *
 * Why: The contract between the notification controller, service, repository,
 * and the mobile client. Notification TYPES are a fixed enum mirroring the
 * `notifications.type` check constraint in migration 0011. Preferences are a
 * flat set of per-user toggles; `push_notifications` is the master switch for
 * the push channel and `email_notifications` is a placeholder for a future
 * channel (unused today — no email is sent). All camelCase here; the repository
 * maps to/from snake_case at the DB boundary.
 */

/** Allowed notification types (mirrors the DB check constraint). */
export const NOTIFICATION_TYPES = [
  'new_match',
  'new_message',
  'verification_approved',
  'verification_rejected',
  'report_resolved',
  'super_like_received',
  'boost_started',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Allowed device platforms. */
export const PLATFORMS = ['ios', 'android', 'web'] as const;
export type Platform = (typeof PLATFORMS)[number];

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
export const registerDeviceSchema = z.object({
  deviceToken: z.string().min(1, 'deviceToken is required'),
  platform: z.enum(PLATFORMS),
  deviceName: z.string().max(120).optional(),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

/** Body for PUT /notifications/preferences (all fields optional). */
export const updatePreferencesSchema = z.object({
  newMatch: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  profileLike: z.boolean().optional(),
  verificationUpdates: z.boolean().optional(),
  marketing: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
