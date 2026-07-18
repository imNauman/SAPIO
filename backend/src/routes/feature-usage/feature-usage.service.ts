import { supabaseAdmin } from '../../config/supabase';
import { badRequest, forbidden } from '../../utils/errors';
import { subscriptionService } from '../subscription/subscription.service';
import {
  featureUsageRepository,
} from './feature-usage.repository';
import { FeatureUsage, LimitedFeatureKey } from './feature-usage.types';

/**
 * Feature-usage service.
 *
 * Why: Enforces daily limits for limited features WITHOUT hardcoding the cap in
 * business logic. The cap is resolved dynamically from the caller's subscription
 * features (e.g. `super_like_daily_limit`). Free users resolve to 0, so they can
 * never bypass a limit. The counter resets automatically at the start of each
 * UTC day (handled by the repository). This module is the single gate used by
 * the Super Like flow.
 */
export const featureUsageService = {
  /**
   * Resolve the daily limit for a feature from the caller's subscription
   * features. Returns 0 when the feature is absent (Free users).
   */
  async resolveDailyLimit(
    userId: string,
    featureKey: LimitedFeatureKey,
  ): Promise<number> {
    const limitKey =
      featureKey === 'super_like' ? 'super_like_daily_limit' : featureKey;
    const features = await subscriptionService.getFeatures(userId);
    const feature = features.find((f) => f.key === limitKey);
    if (!feature) return 0;
    const value = Number(feature.value);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  },

  /**
   * Check the limit and consume one use. Throws when the feature is not
   * permitted (403) or the daily limit is exhausted (429). Returns the updated
   * usage state on success.
   */
  async checkAndConsume(
    userId: string,
    featureKey: LimitedFeatureKey,
  ): Promise<FeatureUsage> {
    const hasFeature = await subscriptionService.hasFeature(userId, featureKey);
    if (!hasFeature) {
      throw forbidden(`This feature requires a premium plan: ${featureKey}`);
    }

    const dailyLimit = await this.resolveDailyLimit(userId, featureKey);
    const usage = await featureUsageRepository.ensureUsage(
      supabaseAdmin,
      userId,
      featureKey,
      dailyLimit,
    );

    if (usage.dailyLimit <= 0 || usage.usedToday >= usage.dailyLimit) {
      throw badRequest(
        `You have used all your ${featureKey} actions for today (limit ${usage.dailyLimit}).`,
      );
    }

    const updated = await featureUsageRepository.increment(supabaseAdmin, usage.id);
    return {
      id: updated.id,
      userId: updated.userId,
      featureKey: updated.featureKey,
      dailyLimit: updated.dailyLimit,
      usedToday: updated.usedToday,
      lastReset: updated.lastReset,
      remaining: Math.max(0, updated.dailyLimit - updated.usedToday),
    };
  },

  /** Read the current usage (and remaining count) for a feature. */
  async getUsage(
    userId: string,
    featureKey: LimitedFeatureKey,
  ): Promise<FeatureUsage> {
    const dailyLimit = await this.resolveDailyLimit(userId, featureKey);
    const row = await featureUsageRepository.getUsage(
      supabaseAdmin,
      userId,
      featureKey,
    );
    if (!row) {
      return {
        id: '',
        userId,
        featureKey,
        dailyLimit,
        usedToday: 0,
        lastReset: new Date().toISOString(),
        remaining: dailyLimit,
      };
    }
    return {
      id: row.id,
      userId: row.userId,
      featureKey: row.featureKey,
      dailyLimit: row.dailyLimit,
      usedToday: row.usedToday,
      lastReset: row.lastReset,
      remaining: Math.max(0, row.dailyLimit - row.usedToday),
    };
  },
};
