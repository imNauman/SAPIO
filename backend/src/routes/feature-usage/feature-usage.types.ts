import { z } from 'zod';

/**
 * Feature-usage domain types + validation.
 *
 * Why: Daily limits for limited features (e.g. Super Like) are enforced here,
 * decoupled from the feature itself. The `daily_limit` is resolved dynamically
 * from the caller's subscription features (Free = 0), so Free users can never
 * bypass a limit. `used_today` resets automatically at the start of each UTC
 * day (see the repository's `ensureUsage` reset logic). All camelCase; the
 * repository maps to/from snake_case.
 */

/** Known limited feature keys tracked by this module. */
export const LIMITED_FEATURE_KEYS = ['super_like'] as const;
export type LimitedFeatureKey = (typeof LIMITED_FEATURE_KEYS)[number];

/** A usage record for one user + feature. */
export interface FeatureUsage {
  id: string;
  userId: string;
  featureKey: string;
  dailyLimit: number;
  usedToday: number;
  lastReset: string;
  remaining: number;
}

/** Zod schema for the "consume one use" request body. */
export const consumeUsageSchema = z.object({
  featureKey: z.enum(LIMITED_FEATURE_KEYS),
});
export type ConsumeUsageBody = z.infer<typeof consumeUsageSchema>;
