import { Request, Response } from 'express';
import { asyncHandler } from '../../types';
import { sendSuccess } from '../../utils/response';
import { adminNotificationService } from './adminNotification.service';

/**
 * Admin notification controller.
 *
 * Why: Read-only listing of recent notifications across all users for the
 * Notifications page. Sending is delegated to the existing notification module
 * (out of scope for this milestone). Guarded by `manage_notifications` at the
 * route layer.
 */
export const adminNotificationController = {
  /** GET /api/admin/notifications */
  list: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit ?? 50);
    const notifications = await adminNotificationService.listNotifications(limit);
    sendSuccess(res, { notifications });
  }),
};
