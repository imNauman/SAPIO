import { apiClient } from '../apiClient';
import {
  PlanWithFeatures,
  SubscriptionFeature,
  SubscriptionPlan,
  UserSubscription,
} from '../../types/subscription';

export type {
  PlanWithFeatures,
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionTier,
  UserSubscription,
} from '../../types/subscription';

/**
 * Subscription API client.
 *
 * Why: Thin wrapper around `apiClient` for the Premium platform endpoints. Types
 * mirror the backend contract. No purchase calls exist yet — those arrive with
 * the payment-gateway milestone.
 */
export const subscriptionApi = {
  /** GET /subscription/plans — the catalog of active plans. */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await apiClient.get<{ data: { plans: SubscriptionPlan[] } }>(
      '/subscription/plans',
    );
    return res.data.data.plans;
  },

  /** GET /subscription/plans/compare — plans enriched with their features. */
  async getPlansWithFeatures(): Promise<PlanWithFeatures[]> {
    const res = await apiClient.get<{ data: { plans: PlanWithFeatures[] } }>(
      '/subscription/plans/compare',
    );
    return res.data.data.plans;
  },

  /** GET /subscription/current — the caller's active subscription + features. */
  async getCurrent(): Promise<UserSubscription> {
    const res = await apiClient.get<{ data: { subscription: UserSubscription } }>(
      '/subscription/current',
    );
    return res.data.data.subscription;
  },

  /** GET /subscription/features — the caller's dynamically resolved features. */
  async getFeatures(): Promise<SubscriptionFeature[]> {
    const res = await apiClient.get<{ data: { features: SubscriptionFeature[] } }>(
      '/subscription/features',
    );
    return res.data.data.features;
  },
};
