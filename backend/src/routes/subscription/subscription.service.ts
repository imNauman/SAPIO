import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { subscriptionRepository } from './subscription.repository';
import {
  Platform,
  PlanWithFeatures,
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionTier,
  UserSubscription,
} from './subscription.types';

/**
 * Subscription service — business logic for the Premium platform.
 *
 * Why: Decouples the controller from the data layer and owns the "exactly one
 * active subscription per user, Free by default" rule. Feature flags are
 * resolved dynamically from `subscription_features` — callers (and the
 * `requireFeature` middleware) must never hardcode which tier has which feature.
 *
 * Payment-provider seam: `PaymentProvider` is the interface future Google Play
 * Billing / Apple StoreKit / Stripe integrations implement. They call
 * `activateSubscription` / `cancelSubscription` on this service; no other code
 * needs to change. No provider is implemented in this milestone.
 */

/** Parameters a payment provider supplies when activating a subscription. */
export interface ActivateSubscriptionParams {
  userId: string;
  planId: string;
  platform: Platform;
  purchaseToken?: string | null;
  expiresAt?: string | null;
  renewalDate?: string | null;
}

/**
 * Contract every billing backend (Google Play, Apple, Stripe) implements later.
 * The service depends on this abstraction, not on any concrete gateway.
 */
export interface PaymentProvider {
  readonly name: Platform;
  /** Validate a purchase/receipt and return the plan + validity window. */
  verifyPurchase(token: string): Promise<{
    planId: string;
    expiresAt?: string | null;
    renewalDate?: string | null;
  }>;
  /** Activate a subscription after a verified purchase. */
  activate(params: ActivateSubscriptionParams): Promise<UserSubscription>;
  /** Cancel a subscription (refund/revoke handled by the gateway). */
  cancel(userId: string): Promise<void>;
}

export const subscriptionService = {
  /** List the active plans (catalog). */
  async listPlans(): Promise<SubscriptionPlan[]> {
    return subscriptionRepository.listPlans(supabaseAdmin);
  },

  /** List plans enriched with their feature flags (for the comparison UI). */
  async listPlansWithFeatures(): Promise<PlanWithFeatures[]> {
    const plans = await subscriptionRepository.listPlans(supabaseAdmin);
    const withFeatures = await Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        features: await subscriptionRepository.getPlanFeatures(supabaseAdmin, plan.id),
      })),
    );
    return withFeatures;
  },

  /**
   * Get the caller's current subscription. Idempotently ensures a Free default
   * exists, then returns the active subscription with its resolved plan +
   * features.
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription> {
    return subscriptionRepository.ensureFreeSubscription(supabaseAdmin, userId);
  },

  /** Resolve the caller's feature flags dynamically (Free plan if none). */
  async getFeatures(userId: string): Promise<SubscriptionFeature[]> {
    return subscriptionRepository.getUserFeatures(supabaseAdmin, userId);
  },

  /** Resolve the feature flags for a specific plan. */
  async getPlanFeatures(planId: string): Promise<SubscriptionFeature[]> {
    return subscriptionRepository.getPlanFeatures(supabaseAdmin, planId);
  },

  /**
   * Activate a subscription. This is the seam payment providers call. The
   * repository enforces exactly one active row via the unique partial index.
   */
  async activateSubscription(
    params: ActivateSubscriptionParams,
  ): Promise<UserSubscription> {
    const plan = await subscriptionRepository.getPlanById(supabaseAdmin, params.planId);
    if (!plan) throw new AppError(404, 'Subscription plan not found');
    return subscriptionRepository.activateSubscription(supabaseAdmin, params.userId, params.planId, {
      platform: params.platform,
      purchaseToken: params.purchaseToken ?? null,
      expiresAt: params.expiresAt ?? null,
      renewalDate: params.renewalDate ?? null,
    });
  },

  /** Cancel the caller's active subscription (reverts to Free on next ensure). */
  async cancelSubscription(userId: string): Promise<void> {
    await subscriptionRepository.cancelSubscription(supabaseAdmin, userId);
  },

  /**
   * Helper for `requireFeature`: returns true when the user's current plan
   * enables the given feature key. Resolved dynamically — never hardcoded.
   */
  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const features = await subscriptionRepository.getUserFeatures(supabaseAdmin, userId);
    const feature = features.find((f) => f.key === featureKey);
    if (!feature) return false;
    return feature.value === true || feature.value === 1;
  },
};

export type { SubscriptionTier };
