import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { validateBody } from '../../utils/validate';
import { notificationService } from './notification.service';
import {
  registerDeviceSchema,
  updatePreferencesSchema,
} from './notification.types';

/**
 * Notification controller.
 *
 * Why: Thin HTTP layer. Auth (`authenticate`) sets `req.user`. Handlers validate
 * the body with Zod, delegate to `notificationService`, and return a uniform
 * success envelope. No business logic, no Firebase, no event emission here.
 */
export const notificationController = {
  /** POST /notifications/register-device — register/refresh a push token. */
  registerDevice: [
    validateBody(registerDeviceSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const device = await notificationService.registerDevice(
        userId,
        req.body,
      );
      sendSuccess(res, { device }, 201);
    }),
  ],

  /** GET /notifications — list the user's notifications. */
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notifications = await notificationService.listForUser(userId);
    sendSuccess(res, { notifications });
  }),

  /** PATCH /notifications/read/:id — mark a notification read. */
  markRead: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id;
    const read = await notificationService.markRead(userId, id);
    sendSuccess(res, { read, id });
  }),

  /** GET /notifications/preferences — get the user's preferences. */
  getPreferences: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const preferences = await notificationService.getPreferences(userId);
    sendSuccess(res, { preferences });
  }),

  /** PUT /notifications/preferences — update the user's preferences. */
  updatePreferences: [
    validateBody(updatePreferencesSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const preferences = await notificationService.updatePreferences(
        userId,
        req.body,
      );
      sendSuccess(res, { preferences });
    }),
  ],
};
