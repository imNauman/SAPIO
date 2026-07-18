import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  FeatureKey,
  Platform,
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTier,
  UserSubscription,
} from './subscription.types';

/**
 * Subscription repository — the query layer.
 *
 * Why: All raw Supabase access for subscriptions lives here so the service
 * stays declarative. Tables: `subscription_plans`, `subscription_features`,
 * `user_subscriptions` (migration 0012). Feature flags are resolved dynamically
 * from `subscription_features`; nothing here hardcodes tier→feature mappings.
 */
const PLANS = 'subscription_plans';
const FEATURES = 'subscription_features';
const SUBS = 'user_subscriptions';

/** Detect a unique-violation (duplicate active subscription) error. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

interface PlanRow {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface FeatureRow {
  id: string;
  plan_id: string;
  feature_key: string;
  feature_value: string;
}

interface SubRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  renewal_date: string | null;
  platform: Platform;
  purchase_token: string | null;
  created_at: string;
}

function mapPlan(row: PlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    monthlyPrice: Number(row.monthly_price),
    yearlyPrice: Number(row.yearly_price),
    currency: row.currency,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Parse a stored text value ('true'/'false' or a number) into a typed value. */
function parseFeatureValue(raw: string): boolean | number | string {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const num = Number(raw);
  return Number.isNaN(num) ? raw : num;
}

function mapFeature(row: FeatureRow): SubscriptionFeature {
  return { key: row.feature_key, value: parseFeatureValue(row.feature_value) };
}

export const subscriptionRepository = {
  /** All active plans (the catalog). */
  async listPlans(client: SupabaseClient = supabaseAdmin): Promise<SubscriptionPlan[]> {
    const { data, error } = await client
      .from(PLANS)
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });
    if (error) {
      if (isMissingTable(error)) {
        throw new AppError(500, 'Subscription tables are not initialized');
      }
      throw new AppError(500, error.message);
    }
    return (data as PlanRow[]).map(mapPlan);
  },

  /** All feature rows (optionally filtered by plan). */
  async listFeatures(
    client: SupabaseClient = supabaseAdmin,
    planId?: string,
  ): Promise<SubscriptionFeature[]> {
    let query = client.from(FEATURES).select('*');
    if (planId) query = query.eq('plan_id', planId);
    const { data, error } = await query;
    if (error) throw new AppError(500, error.message);
    return (data as FeatureRow[]).map(mapFeature);
  },

  /** The single active subscription for a user, or null. */
  async getActiveSubscription(
    client: SupabaseClient,
    userId: string,
  ): Promise<UserSubscription | null> {
    const { data, error } = await client
      .from(SUBS)
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    const row = data as SubRow & { plan: PlanRow };
    const features = await this.listFeatures(client, row.plan_id);
    return {
      id: row.id,
      userId: row.user_id,
      plan: mapPlan(row.plan),
      status: row.status,
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      renewalDate: row.renewal_date,
      platform: row.platform,
      purchaseToken: row.purchase_token,
      createdAt: row.created_at,
      features,
    };
  },

  /** Look up a plan by id. */
  async getPlanById(
    client: SupabaseClient,
    planId: string,
  ): Promise<SubscriptionPlan | null> {
    const { data, error } = await client
      .from(PLANS)
      .select('*')
      .eq('id', planId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return data ? mapPlan(data as PlanRow) : null;
  },

  /** Look up a plan by tier. */
  async getPlanByTier(
    client: SupabaseClient,
    tier: SubscriptionTier,
  ): Promise<SubscriptionPlan | null> {
    const { data, error } = await client
      .from(PLANS)
      .select('*')
      .eq('tier', tier)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return data ? mapPlan(data as PlanRow) : null;
  },

  /**
   * Idempotently ensure the user has exactly one active subscription. If none
   * exists, create one linked to the Free plan. The unique partial index
   * (`user_subscriptions_user_active_idx`) guarantees at most one active row;
   * a duplicate insert is swallowed as a no-op.
   */
  async ensureFreeSubscription(
    client: SupabaseClient,
    userId: string,
  ): Promise<UserSubscription> {
    const existing = await this.getActiveSubscription(client, userId);
    if (existing) return existing;

    const freePlan = await this.getPlanByTier(client, 'free');
    if (!freePlan) throw new AppError(500, 'Free plan is not configured');

    const { error } = await client.from(SUBS).insert({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      platform: 'free',
    });
    if (error && !isDuplicateKey(error)) {
      throw new AppError(500, error.message);
    }
    // On a race (duplicate key), re-read the winner.
    const created = await this.getActiveSubscription(client, userId);
    if (!created) throw new AppError(500, 'Failed to initialize subscription');
    return created;
  },

  /**
   * Activate (or replace) a subscription for a user. This is the seam future
   * payment providers call. The unique partial index enforces exactly one
   * active row, so we cancel any existing active sub first.
   */
  async activateSubscription(
    client: SupabaseClient,
    userId: string,
    planId: string,
    opts: {
      platform: Platform;
      purchaseToken?: string | null;
      expiresAt?: string | null;
      renewalDate?: string | null;
    },
  ): Promise<UserSubscription> {
    // Cancel any currently active subscription.
    await client
      .from(SUBS)
      .update({ status: 'canceled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    const { error } = await client.from(SUBS).insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      platform: opts.platform,
      purchase_token: opts.purchaseToken ?? null,
      expires_at: opts.expiresAt ?? null,
      renewal_date: opts.renewalDate ?? null,
    });
    if (error) throw new AppError(500, error.message);

    const created = await this.getActiveSubscription(client, userId);
    if (!created) throw new AppError(500, 'Failed to activate subscription');
    return created;
  },

  /** Mark the user's active subscription as canceled. */
  async cancelSubscription(
    client: SupabaseClient,
    userId: string,
  ): Promise<void> {
    const { error } = await client
      .from(SUBS)
      .update({ status: 'canceled' })
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw new AppError(500, error.message);
  },

  /** Resolve the feature flags for a user's current plan (Free if none). */
  async getUserFeatures(
    client: SupabaseClient,
    userId: string,
  ): Promise<SubscriptionFeature[]> {
    const sub = await this.getActiveSubscription(client, userId);
    if (sub) return sub.features;
    const freePlan = await this.getPlanByTier(client, 'free');
    if (!freePlan) return [];
    return this.listFeatures(client, freePlan.id);
  },

  /** Resolve the feature flags for a given plan id. */
  async getPlanFeatures(
    client: SupabaseClient,
    planId: string,
  ): Promise<SubscriptionFeature[]> {
    return this.listFeatures(client, planId);
  },
};

export type { FeatureKey };
