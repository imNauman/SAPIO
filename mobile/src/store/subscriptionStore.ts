import { create } from 'zustand';
import {
  subscriptionApi,
  PlanWithFeatures,
  SubscriptionFeature,
  SubscriptionPlan,
  UserSubscription,
} from '../lib/api/subscription.api';

/**
 * Subscription store (Zustand).
 *
 * Why: Single source of truth for the caller's premium state. `currentPlan` and
 * `features` power `CurrentPlanCard`; `availablePlans` powers the plan list and
 * `FeatureComparisonTable`. `refreshSubscription` loads the caller's current
 * plan + features (idempotently creating the Free default server-side);
 * `refreshPlans` loads the catalog. No purchase actions exist yet — those
 * arrive with the payment-gateway milestone. All HTTP lives in
 * `subscription.api`; this store is a thin state container.
 */
interface SubscriptionState {
  currentPlan: SubscriptionPlan | null;
  currentSubscription: UserSubscription | null;
  availablePlans: SubscriptionPlan[];
  plansWithFeatures: PlanWithFeatures[];
  features: SubscriptionFeature[];
  loading: boolean;
  error: string | null;

  /** Load the caller's current plan + features. */
  refreshSubscription: () => Promise<void>;
  /** Load the catalog of available plans (with features). */
  refreshPlans: () => Promise<void>;
  /** Clear all subscription state (e.g. on logout). */
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  currentPlan: null,
  currentSubscription: null,
  availablePlans: [],
  plansWithFeatures: [],
  features: [],
  loading: false,
  error: null,

  refreshSubscription: async () => {
    set({ loading: true, error: null });
    try {
      const [subscription, features] = await Promise.all([
        subscriptionApi.getCurrent(),
        subscriptionApi.getFeatures(),
      ]);
      set({
        currentSubscription: subscription,
        currentPlan: subscription.plan,
        features,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error:
          e instanceof Error ? e.message : 'Failed to load subscription',
      });
    }
  },

  refreshPlans: async () => {
    set({ loading: true, error: null });
    try {
      const [availablePlans, plansWithFeatures] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getPlansWithFeatures(),
      ]);
      set({ availablePlans, plansWithFeatures, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load plans',
      });
    }
  },

  clear: () => {
    set({
      currentPlan: null,
      currentSubscription: null,
      availablePlans: [],
      plansWithFeatures: [],
      features: [],
      loading: false,
      error: null,
    });
  },
}));
