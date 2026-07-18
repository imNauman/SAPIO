import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess, sendMessage } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { settingsService } from './settings.service';
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  updateSettingsSchema,
} from './settings.types';
import { AuthUser } from '../auth/auth.types';

/**
 * Settings & Account controller.
 *
 * Why: Thin layer mapping HTTP to the settings service. Every handler requires
 * the `authenticate` middleware (mounted at the router level), so `req.user` is
 * always present. The user's id + email come from the resolved auth user — we
 * never trust a client-supplied id.
 */
function currentUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthenticated');
  }
  return user;
}

export const settingsController = {
  /** GET /settings */
  get: asyncHandler(async (req: Request, res: Response) => {
    const bundle = await settingsService.getBundle(currentUser(req).id);
    sendSuccess(res, { settings: bundle });
  }),

  /** PATCH /settings */
  update: [
    validateBody(updateSettingsSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const settings = await settingsService.updateSettings(
        currentUser(req).id,
        req.body,
      );
      sendSuccess(res, { settings });
    }),
  ],

  /** PATCH /account/password */
  changePassword: [
    validateBody(changePasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const user = currentUser(req);
      await settingsService.changePassword(user.id, user.email ?? '', req.body);
      sendMessage(res, 'Password updated successfully');
    }),
  ],

  /** PATCH /account/email */
  changeEmail: [
    validateBody(changeEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const user = currentUser(req);
      await settingsService.changeEmail(user.id, user.email ?? '', req.body);
      sendMessage(res, 'Email update initiated. Check your inbox to confirm.');
    }),
  ],

  /** DELETE /account */
  delete: [
    validateBody(deleteAccountSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const user = currentUser(req);
      await settingsService.deleteAccount(user.id, user.email ?? '', req.body);
      sendMessage(res, 'Account deleted. We are sorry to see you go.');
    }),
  ],
};
