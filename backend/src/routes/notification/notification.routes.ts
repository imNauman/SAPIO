import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { notificationController } from './notification.controller';

/**
 * Notification routes.
 *
 * Why: Mounts the notification HTTP surface under /api/notifications. All routes
 * require authentication. The mobile app uses these to register its push token,
 * read the inbox, mark items read, and manage preferences. Delivery itself is
 * event-driven (see notification.subscriber) and never triggered from here.
 */
export const notificationRoutes = Router();

notificationRoutes.use(authenticate);

notificationRoutes.post('/register-device', ...notificationController.registerDevice);
notificationRoutes.get('/', notificationController.list);
notificationRoutes.patch('/read/:id', notificationController.markRead);
notificationRoutes.get('/preferences', notificationController.getPreferences);
notificationRoutes.put('/preferences', ...notificationController.updatePreferences);
