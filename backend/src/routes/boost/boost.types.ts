import { z } from 'zod';

/**
 * Boost domain types + validation.
 *
 * Why: A Boost temporarily multiplies a user's recommendation score so they
 * surface higher in other users' feeds. Only Premium tiers may start a Boost
 * (enforced via `requireFeature('boost')`). The multiplier is stored per
 * `boost_sessions` row so it can be tuned (e.g. A/B testing) without touching
 * recommendation scoring code. All camelCase; the repository maps to/from
 * snake_case.
 */

/** A boost session record. */
export interface BoostSession {
  id: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  boostMultiplier: number;
  status: 'active' | 'expired' | 'canceled';
  createdAt: string;
}

/** Default boost duration in minutes. */
export const BOOST_DURATION_MINUTES = 30;

/** Request body to start a boost (no params today; multiplier is server-side). */
export const startBoostSchema = z.object({}).strict();
export type StartBoostBody = z.infer<typeof startBoostSchema>;
