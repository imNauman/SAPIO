import { supabaseAdmin } from '../../config/supabase';
import { conflict } from '../../utils/errors';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import { boostRepository } from './boost.repository';
import {
  BoostSession,
  BOOST_DURATION_MINUTES,
} from './boost.types';

/**
 * Boost service.
 *
 * Why: Encapsulates the Boost lifecycle. A Boost is a temporary recommendation
 * score multiplier. Only Premium tiers may start one (the route guards with
 * `requireFeature('boost')`). At most one active boost per user is allowed. The
 * multiplier is stored per `boost_sessions` row so it can be tuned (e.g. A/B
 * testing) without changing recommendation scoring code — the engine only
 * reads the multiplier. Starting a boost publishes a `boost.started` domain
 * event (the notification module delivers it).
 */
export const boostService = {
  /** The caller's currently active boost, if any. */
  async getStatus(userId: string): Promise<{ boost: BoostSession | null }> {
    const row = await boostRepository.getActiveBoost(supabaseAdmin, userId);
    return { boost: row ? this.toSession(row) : null };
  },

  /**
   * Start a new boost for the caller. Enforces a single active boost and emits
   * a `boost.started` event. The multiplier is the server-configured default
   * (see `resolveMultiplier`) — the only value an A/B framework would vary.
   */
  async startBoost(userId: string): Promise<{ boost: BoostSession }> {
    const existing = await boostRepository.getActiveBoost(supabaseAdmin, userId);
    if (existing) {
      throw conflict('You already have an active boost running.');
    }

    const multiplier = this.resolveMultiplier();
    const expiresAt = new Date(
      Date.now() + BOOST_DURATION_MINUTES * 60 * 1000,
    ).toISOString();

    const row = await boostRepository.createBoost(
      supabaseAdmin,
      userId,
      expiresAt,
      multiplier,
    );
    const boost = this.toSession(row);

    // Publish a domain event (notification module subscribes + delivers).
    emit(NOTIFICATION_EVENTS.BOOST_STARTED, {
      userId,
      multiplier,
      expiresAt,
    });

    return { boost };
  },

  /**
   * Resolve the boost multiplier. Centralized here so an A/B testing framework
   * can vary the returned value (e.g. by experiment assignment) WITHOUT
   * touching recommendation scoring logic — the engine only consumes the
   * stored per-session multiplier. Business rules (who may boost) live in the
   * route guard, not here.
   */
  resolveMultiplier(): number {
    return 2.0;
  },

  /** Map a snake_case DB row into the camelCase session shape. */
  toSession(row: {
    id: string;
    user_id: string;
    started_at: string;
    expires_at: string;
    boost_multiplier: number;
    status: 'active' | 'expired' | 'canceled';
    created_at: string;
  }): BoostSession {
    return {
      id: row.id,
      userId: row.user_id,
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      boostMultiplier: Number(row.boost_multiplier),
      status: row.status,
      createdAt: row.created_at,
    };
  },
};
