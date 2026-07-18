/**
 * Notification domain event constants + payload types.
 *
 * Why: Centralizes the event names emitted by business modules and consumed by
 * the notification subscriber. Business modules import `NOTIFICATION_EVENTS`
 * (the string constants) to publish; the subscriber imports the same constants
 * to listen. The payload interfaces are re-exported from `eventBus.EventMap` so
 * there is a single source of truth for shapes.
 */

import type { EventMap, EventName } from './eventBus';

/** Stable event-name constants. Use these when emitting/subscribing. */
export const NOTIFICATION_EVENTS = {
  MATCH_CREATED: 'match.created',
  MESSAGE_CREATED: 'chat.message.created',
  VERIFICATION_APPROVED: 'verification.approved',
  VERIFICATION_REJECTED: 'verification.rejected',
  REPORT_RESOLVED: 'report.resolved',
  BOOST_STARTED: 'boost.started',
  SUPER_LIKE_RECEIVED: 'super_like.received',
  CHAT_TYPING: 'chat.typing',
} as const satisfies Record<string, EventName>;

/** Payload shapes (re-exported for convenience). */
export type MatchCreatedPayload = EventMap['match.created'];
export type MessageCreatedPayload = EventMap['chat.message.created'];
export type VerificationApprovedPayload = EventMap['verification.approved'];
export type VerificationRejectedPayload = EventMap['verification.rejected'];
export type ReportResolvedPayload = EventMap['report.resolved'];
export type BoostStartedPayload = EventMap['boost.started'];
export type SuperLikeReceivedPayload = EventMap['super_like.received'];
