import { z } from 'zod';

/**
 * Subscription domain types + validation.
 *
 * Why: The contract between the subscription controller, service, repository,
 * and the mobile client. Tiers and feature keys are enumerations mirroring the
 * DB check constraints in migration 0012. Feature flags are resolved DYNAMICALLY
 * from `subscription_features` — code must never hardcode which tier has which
 * feature. All camelCase here; the repository maps to/from snake_case.
 */

/** Allowed subscription tiers (mirrors the DB check constraint). */
export const SUBSCRIPTION_TIERS = ['free', 'plus', 'gold', 'platinum'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

/** Allowed subscription statuses. */
export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'expired',
  'pending',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Allowed billing platforms (payment-provider agnostic). */
export const PLATFORMS = ['free', 'google', 'apple', 'stripe'] as const;
export type Platform = (typeof PLATFORMS)[number];

/**
 * Known feature keys. These are the canonical gate identifiers used by
 * `requireFeature`. The set is open — new features are added as rows in
 * `subscription_features`, not as code changes.
 */
export const FEATURE_KEYS = [
  'unlimited_swipes',
  'unlimited_rewinds',
  'passport',
  'see_who_liked_you',
  'priority_likes',
  'advanced_filters',
  'read_receipts',
  'boost',
  'super_like',
  'super_like_daily_limit',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** A subscription plan (catalog entry). */
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

/** A feature flag resolved for a plan. */
export interface SubscriptionFeature {
  key: FeatureKey | string;
  /** Parsed boolean (or numeric) value. Stored as text in the DB. */
  value: boolean | number | string;
}

/** The caller's current subscription (with resolved plan + features). */
export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  renewalDate: string | null;
  platform: Platform;
  purchaseToken: string | null;
  createdAt: string;
  /** Dynamically resolved feature flags for the current plan. */
  features: SubscriptionFeature[];
}

/** A plan enriched with its feature flags (for the comparison UI). */
export interface PlanWithFeatures extends SubscriptionPlan {
  features: SubscriptionFeature[];
}

// No request bodies are required for the read-only subscription API in this
// milestone (purchases/webhooks are a future step). Validation helpers are kept
// for forward-compatibility (e.g. a future `changePlan` body).
export const changePlanSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS),
  platform: z.enum(PLATFORMS).default('free'),
});
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
