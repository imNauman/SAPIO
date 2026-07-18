import { initializeApp, cert, getApps, getApp, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { config } from '../../config';

/**
 * Firebase Cloud Messaging (FCM) service.
 *
 * Why: This is the ONLY module that talks to Firebase. The notification service
 * calls `firebaseService.sendToToken`/`sendMulticast` — no business module and
 * no other part of the codebase imports firebase-admin. If Firebase credentials
 * are absent (local dev, tests), the service logs a warning and no-ops, so the
 * rest of the app runs fine. This keeps delivery fully decoupled from business
 * logic and makes adding Email/SMS later a matter of writing a sibling service.
 */

interface FcmPayload {
  title: string;
  body: string;
  /** Arbitrary key/value data sent to the device (kept as strings). */
  data?: Record<string, string>;
}

let app: App | null = null;
let messaging: Messaging | null = null;
let warned = false;

/** Lazily initialize the Firebase app from config (idempotent). */
function ensureApp(): Messaging | null {
  if (messaging) return messaging;

  const f = config.firebase;
  const hasCreds = f.projectId && f.clientEmail && f.privateKey;
  if (!hasCreds) {
    if (!warned) {
      // eslint-disable-next-line no-console
      console.warn(
        '[firebase.service] FIREBASE credentials missing — push delivery is disabled. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to enable.',
      );
      warned = true;
    }
    return null;
  }

  try {
    app = getApps().length ? getApp() : initializeApp({
      credential: cert({
        projectId: f.projectId,
        clientEmail: f.clientEmail,
        privateKey: f.privateKey.replace(/\\n/g, '\n'),
      }),
    });
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[firebase.service] Failed to initialize Firebase:', err);
    return null;
  }
}

export const firebaseService = {
  /**
   * Send a notification to a single device token. Returns true if sent (or
   * skipped because Firebase is unconfigured), false if FCM rejected it.
   */
  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    const m = ensureApp();
    if (!m) return false;
    try {
      await m.send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
      return true;
    } catch (err) {
      // Invalid/unknown token etc. — log and continue (don't crash the batch).
      // eslint-disable-next-line no-console
      console.warn(`[firebase.service] sendToToken failed for ${token}:`, err);
      return false;
    }
  },

  /**
   * Send to many tokens at once. Returns the count of successful deliveries.
   * Individual failures are logged and skipped.
   */
  async sendMulticast(
    tokens: string[],
    payload: FcmPayload,
  ): Promise<number> {
    const m = ensureApp();
    if (!m || tokens.length === 0) return 0;
    try {
      const result = await m.sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
      // Log any failures (e.g. unregistered tokens) for cleanup later.
      result.responses.forEach((r, i: number) => {
        if (!r.success) {
          // eslint-disable-next-line no-console
          console.warn(
            `[firebase.service] multicast failure for ${tokens[i]}:`,
            r.error?.message,
          );
        }
      });
      return result.successCount;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[firebase.service] sendMulticast failed:', err);
      return 0;
    }
  },
};
