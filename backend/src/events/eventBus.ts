/**
 * In-process typed event bus.
 *
 * Why: This is the single seam between business logic and notification
 * delivery. Business modules (match, chat, verification, report) publish domain
 * EVENTS here and NOTHING else — they never import the notification service or
 * Firebase. The notification module subscribes to these events and handles
 * persistence + dispatch. Keeping the bus in-process (a thin wrapper over
 * Node's EventEmitter) is enough for a single-instance server; if we later run
 * multiple instances we can swap the implementation for a broker without
 * changing any publisher or subscriber code.
 */

import { EventEmitter } from 'node:events';

/** Map of event name -> payload shape. Add new domain events here. */
export interface EventMap {
  'match.created': { userId: string; actorId: string; actorName: string | null; matchId: string };
  'chat.message.created': {
    userId: string;
    actorId: string;
    actorName: string | null;
    conversationId: string;
    matchId: string;
    preview: string;
  };
  'verification.approved': { userId: string };
  'verification.rejected': { userId: string; reason: string | null };
  'report.resolved': { userId: string; reportId: string };
  'boost.started': { userId: string; multiplier: number; expiresAt: string };
  'super_like.received': {
    userId: string;
    actorId: string;
    actorName: string | null;
    superLikeId: string;
  };
  'chat.typing': {
    conversationId: string;
    userId: string;
    state: 'start' | 'stop';
  };
}

export type EventName = keyof EventMap;

type Handler<E extends EventName> = (payload: EventMap[E]) => void | Promise<void>;

const emitter = new EventEmitter();
// Allow many subscribers (one per event type today, more later).
emitter.setMaxListeners(50);

/**
 * Subscribe to a domain event.
 * Returns an unsubscribe function for tests/cleanup.
 */
export function on<E extends EventName>(event: E, handler: Handler<E>): () => void {
  const wrapped = (payload: EventMap[E]) => handler(payload);
  emitter.on(event, wrapped);
  return () => emitter.off(event, wrapped);
}

/**
 * Publish a domain event. Fire-and-forget from the publisher's perspective —
 * subscribers run synchronously here, but a publisher must never depend on the
 * side effects of a subscriber.
 */
export function emit<E extends EventName>(event: E, payload: EventMap[E]): void {
  emitter.emit(event, payload);
}
