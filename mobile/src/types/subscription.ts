/**
 * Subscription domain types (mobile).
 *
 * Why: Mirror of the backend `subscription.types.ts` contract. Tiers and feature
 * keys are enumerations; feature flags are resolved dynamically from the API and
 * must never be hardcoded in the UI.
 */

export const SUBSCRIPTION_TIERS = ['free', 'plus', 'gold', 'platinum'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'expired',
  'pending',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLATFORMS = ['free', 'google', 'apple', 'stripe'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FEATURE_KEYS = [
  'unlimited_swipes',
  'unlimited_rewinds',
  'passport',
  'see_who_liked_you',
  'priority_likes',
  'advanced_filters',
  'read_receipts',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Human-readable labels for feature keys (used by the comparison UI). */
export const FEATURE_LABELS: Record<string, string> = {
  unlimited_swipes: 'Unlimited Swipes',
  unlimited_rewinds: 'Unlimited Rewinds',
  passport: 'Passport (change location)',
  see_who_liked_you: 'See Who Liked You',
  priority_likes: 'Priority Likes',
  advanced_filters: 'Advanced Filters',
  read_receipts: 'Read Receipts',
};

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

export interface SubscriptionFeature {
  key: FeatureKey | string;
  value: boolean | number | string;
}

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
  features: SubscriptionFeature[];
}

export interface PlanWithFeatures extends SubscriptionPlan {
  features: SubscriptionFeature[];
}
