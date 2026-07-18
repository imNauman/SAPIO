import { on, emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import { notificationService } from './notification.service';

/**
 * Notification event subscribers.
 *
 * Why: This module is the bridge between the domain EVENT bus and the
 * notification service. Each handler maps a domain event to a concrete
 * notification (title/body/payload) and calls `notificationService.createAndDispatch`.
 * Business modules only `emit` events — they never reach this code. Register
 * these once at startup (see app.ts / server.ts).
 */

let registered = false;

export function registerNotificationSubscribers(): void {
  if (registered) return; // idempotent
  registered = true;

  on(NOTIFICATION_EVENTS.MATCH_CREATED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'new_match',
      title: 'New match!',
      body: p.actorName
        ? `${p.actorName} liked you back`
        : 'Someone liked you back',
      payload: { matchId: p.matchId, actorId: p.actorId },
    });
  });

  on(NOTIFICATION_EVENTS.MESSAGE_CREATED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'new_message',
      title: p.actorName ?? 'New message',
      body: p.preview,
      payload: {
        conversationId: p.conversationId,
        matchId: p.matchId,
        actorId: p.actorId,
      },
    });
  });

  on(NOTIFICATION_EVENTS.VERIFICATION_APPROVED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'verification_approved',
      title: "You're verified!",
      body: 'Your profile is now verified. The verified badge is live.',
      payload: {},
    });
  });

  on(NOTIFICATION_EVENTS.VERIFICATION_REJECTED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'verification_rejected',
      title: 'Verification not approved',
      body: p.reason
        ? `Your verification was not approved: ${p.reason}`
        : 'Your verification request was not approved. You can try again.',
      payload: { reason: p.reason },
    });
  });

  on(NOTIFICATION_EVENTS.REPORT_RESOLVED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'report_resolved',
      title: 'Your report was resolved',
      body: 'Thanks for helping keep SAPIO safe. We have reviewed your report.',
      payload: { reportId: p.reportId },
    });
  });

  on(NOTIFICATION_EVENTS.SUPER_LIKE_RECEIVED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'super_like_received',
      title: 'You got a Super Like!',
      body: p.actorName
        ? `${p.actorName} super liked you`
        : 'Someone super liked you',
      payload: { superLikeId: p.superLikeId, actorId: p.actorId },
    });
  });

  on(NOTIFICATION_EVENTS.BOOST_STARTED, async (p) => {
    await notificationService.createAndDispatch({
      userId: p.userId,
      type: 'boost_started',
      title: 'Boost activated',
      body: 'Your profile is now boosted and showing to more people.',
      payload: { multiplier: p.multiplier, expiresAt: p.expiresAt },
    });
  });
}

// Re-export for convenience/tests.
export { emit };
