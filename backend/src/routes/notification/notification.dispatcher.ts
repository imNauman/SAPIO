import { firebaseService } from './firebase.service';
import { Notification } from './notification.types';

/**
 * Notification dispatcher.
 *
 * Why: The channel-agnostic seam between the notification SERVICE (which decides
 * WHAT to send and to WHOM, applying preferences) and the actual delivery
 * CHANNELS (Push via FCM today). To add Email or SMS later, write a sibling
 * dispatch function (or dispatcher object) that reads the same `Notification`
 * and preferences — no business module changes required. The service is the
 * only caller of the dispatcher.
 */

export const notificationDispatcher = {
  /**
   * Dispatch a persisted notification to a set of device tokens via FCM.
   * `payload.data` carries structured info (ids, type) so the mobile app can
   * deep-link when the user taps the push.
   */
  async dispatchPush(
    notification: Notification,
    tokens: string[],
  ): Promise<number> {
    if (tokens.length === 0) return 0;
    return firebaseService.sendMulticast(tokens, {
      title: notification.title,
      body: notification.body,
      data: {
        notificationId: notification.id,
        type: notification.type,
        ...(notification.payload
          ? { payload: JSON.stringify(notification.payload) }
          : {}),
      },
    });
  },
};
