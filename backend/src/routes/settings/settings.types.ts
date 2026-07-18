import { z } from 'zod';

/**
 * Settings & Account Management domain types + validation.
 *
 * Why: The contract between the settings controller, service, repository, and
 * the mobile client. Privacy + discovery preferences live in `user_settings`
 * (owned here); notification preferences are REUSED from `notification_preferences`
 * (see notification module) and discovery *filters* are REUSED from
 * `user_preferences` (see recommendation module). Account actions (password,
 * email, delete) mutate the auth user + profile, never duplicating auth logic.
 */

/** Privacy + discovery toggles (mirrors `user_settings`). */
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

/** The full settings bundle returned by GET /settings. */
export interface SettingsBundle {
  settings: UserSettings;
  notifications: {
    newMatch: boolean;
    newMessage: boolean;
    profileLike: boolean;
    verificationUpdates: boolean;
    marketing: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  discovery: {
    minimumAge: number;
    maximumAge: number;
    maximumDistanceKm: number;
    interestedIn: string[];
    relationshipGoal: string | null;
    showVerifiedOnly: boolean;
    showOnlineOnly: boolean;
    hideInactiveUsers: boolean;
    preferredLanguages: string[];
  };
  account: {
    email: string | null;
    isVerified: boolean;
    isPremium: boolean;
    subscriptionPlan: string | null;
    lastSignInAt: string | null;
    accountStatus: string;
  };
}

/** PATCH /settings body — all privacy fields optional. */
export const updateSettingsSchema = z.object({
  showAge: z.boolean().optional(),
  showDistance: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
  allowMessagesFromMatchesOnly: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  hideVerifiedBadge: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/** PATCH /account/password body. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** PATCH /account/email body. */
export const changeEmailSchema = z.object({
  newEmail: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password confirmation is required'),
});
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

/** DELETE /account body. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** Minimum password length enforced server-side. */
export const MIN_PASSWORD_LENGTH = 8;
