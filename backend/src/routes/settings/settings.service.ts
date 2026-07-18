import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { authService } from '../auth/auth.service';
import { settingsRepo } from './settings.repository';
import {
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  SettingsBundle,
  UpdateSettingsInput,
  UserSettings,
} from './settings.types';

/**
 * Settings & Account service.
 *
 * Why: Orchestrates the user-facing settings surface and account lifecycle.
 * It composes the dedicated repositories (profile, notification, recommendation,
 * subscription) and the auth service so no business logic is duplicated:
 *   - privacy toggles      -> settingsRepo (user_settings)
 *   - notification prefs   -> notificationRepository (reused)
 *   - discovery filters    -> recommendationRepository (reused)
 *   - subscription plan    -> subscriptionRepository (reused)
 *   - password / email     -> authService (reused)
 *   - delete / logout      -> settingsRepo.softDeleteAccount + authService
 */
export const settingsService = {
  /** GET /settings — the full bundle the Settings screen renders. */
  async getBundle(userId: string): Promise<SettingsBundle> {
    const [settings, notifications, discovery, subscription, authMeta, profile] =
      await Promise.all([
        settingsRepo.getSettings(userId),
        settingsRepo.notificationRepository.getPreferences(supabaseAdmin, userId),
        settingsRepo.recommendationRepository.getPreferences(supabaseAdmin, userId),
        settingsRepo.subscriptionRepository.getActiveSubscription(
          supabaseAdmin,
          userId,
        ),
        settingsRepo.getAuthMeta(userId),
        settingsRepo.profileRepo.findByUserId(userId),
      ]);

    return {
      settings,
      notifications: {
        newMatch: notifications.newMatch,
        newMessage: notifications.newMessage,
        profileLike: notifications.profileLike,
        verificationUpdates: notifications.verificationUpdates,
        marketing: notifications.marketing,
        emailNotifications: notifications.emailNotifications,
        pushNotifications: notifications.pushNotifications,
      },
      discovery: {
        minimumAge: discovery.minimumAge,
        maximumAge: discovery.maximumAge,
        maximumDistanceKm: discovery.maximumDistanceKm,
        interestedIn: discovery.interestedIn,
        relationshipGoal: discovery.relationshipGoal,
        showVerifiedOnly: discovery.showVerifiedOnly,
        showOnlineOnly: discovery.showOnlineOnly,
        hideInactiveUsers: discovery.hideInactiveUsers,
        preferredLanguages: discovery.preferredLanguages,
      },
      account: {
        email: authMeta.email,
        isVerified: profile?.isVerified ?? false,
        isPremium: profile?.isPremium ?? false,
        subscriptionPlan: subscription?.plan?.name ?? null,
        lastSignInAt: authMeta.lastSignInAt,
        accountStatus: authMeta.status,
      },
    };
  },

  /** PATCH /settings — update privacy toggles. */
  async updateSettings(
    userId: string,
    input: UpdateSettingsInput,
  ): Promise<UserSettings> {
    return settingsRepo.updateSettings(userId, input);
  },

  /** PATCH /account/password. */
  async changePassword(
    userId: string,
    email: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    // 1. Confirm the current password (re-auth with anon client).
    const ok = await authService.reauthenticate(email, input.currentPassword);
    if (!ok) {
      throw new AppError(401, 'Current password is incorrect');
    }
    // 2. Update password via admin API (revokes other refresh tokens).
    await authService.changePassword(userId, input.newPassword);
  },

  /** PATCH /account/email. */
  async changeEmail(
    userId: string,
    email: string,
    input: ChangeEmailInput,
  ): Promise<void> {
    // 1. Confirm the current password.
    const ok = await authService.reauthenticate(email, input.password);
    if (!ok) {
      throw new AppError(401, 'Password confirmation is incorrect');
    }
    // 2. Prevent duplicate emails.
    const taken = await authService.isEmailTaken(
      supabaseAdmin,
      input.newEmail,
      userId,
    );
    if (taken) {
      throw new AppError(409, 'That email is already in use');
    }
    // 3. Update the auth provider (Supabase may send a confirmation email).
    await authService.changeEmail(userId, input.newEmail);
  },

  /** DELETE /account — soft delete. */
  async deleteAccount(
    userId: string,
    email: string,
    input: DeleteAccountInput,
  ): Promise<void> {
    // 1. Confirm the password.
    const ok = await authService.reauthenticate(email, input.password);
    if (!ok) {
      throw new AppError(401, 'Password confirmation is incorrect');
    }
    // 2. Soft-delete: hide from discovery, mark deleted, drop tokens, revoke
    //    sessions. Rows are preserved for legal consistency.
    await settingsRepo.softDeleteAccount(userId);
  },
};
