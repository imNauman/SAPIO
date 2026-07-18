import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';

/**
 * Feature-usage repository — the query layer for daily counters.
 *
 * Why: Owns all raw Supabase access for `feature_usage`. The reset rule lives
 * here: a record is considered "stale" when `last_reset` is on a previous UTC
 * day, in which case `used_today` is reset to 0 and `last_reset` advances. The
 * service decides whether a consume is allowed; this layer just persists state.
 */
const TABLE = 'feature_usage';

/** True when the error indicates a unique-constraint violation. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

/** Returns true when `lastReset` is before the start of the current UTC day. */
function isStale(lastReset: string): boolean {
  const reset = new Date(lastReset);
  const now = new Date();
  return (
    reset.getUTCFullYear() !== now.getUTCFullYear() ||
    reset.getUTCMonth() !== now.getUTCMonth() ||
    reset.getUTCDate() !== now.getUTCDate()
  );
}

export const featureUsageRepository = {
  /**
   * Get-or-create the usage row for a user + feature, resetting the counter
   * automatically when the previous reset was on an earlier UTC day. Returns the
   * current (possibly reset) usage state.
   */
  async ensureUsage(
    client: SupabaseClient,
    userId: string,
    featureKey: string,
    dailyLimit: number,
  ): Promise<FeatureUsageRow> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);

    if (!data) {
      const { data: inserted, error: insertErr } = await client
        .from(TABLE)
        .insert({
          user_id: userId,
          feature_key: featureKey,
          daily_limit: dailyLimit,
          used_today: 0,
          last_reset: new Date().toISOString(),
        })
        .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
        .single();
      if (insertErr) {
        if (isDuplicateKey(insertErr)) {
          // Race: another request created it. Re-read.
          const { data: again, error: againErr } = await client
            .from(TABLE)
            .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
            .eq('user_id', userId)
            .eq('feature_key', featureKey)
            .single();
          if (againErr) throw new AppError(500, againErr.message);
          return this.normalize(again as FeatureUsageRow);
        }
        throw new AppError(500, insertErr.message);
      }
      return this.normalize(inserted as FeatureUsageRow);
    }

    const row = data as FeatureUsageRow;
    if (isStale(row.last_reset)) {
      const { data: updated, error: updateErr } = await client
        .from(TABLE)
        .update({
          used_today: 0,
          last_reset: new Date().toISOString(),
          daily_limit: dailyLimit,
        })
        .eq('id', row.id)
        .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
        .single();
      if (updateErr) throw new AppError(500, updateErr.message);
      return this.normalize(updated as FeatureUsageRow);
    }

    // Keep the resolved daily limit in sync with the subscription feature.
    if (row.daily_limit !== dailyLimit) {
      const { data: updated, error: updateErr } = await client
        .from(TABLE)
        .update({ daily_limit: dailyLimit })
        .eq('id', row.id)
        .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
        .single();
      if (updateErr) throw new AppError(500, updateErr.message);
      return this.normalize(updated as FeatureUsageRow);
    }

    return this.normalize(row);
  },

  /** Increment `used_today` by one (caller must have checked the limit). */
  async increment(
    client: SupabaseClient,
    id: string,
  ): Promise<FeatureUsageRow> {
    const { data, error } = await client
      .from(TABLE)
      .update({ used_today: supabaseAdmin.raw('used_today + 1') })
      .eq('id', id)
      .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
      .single();
    if (error) throw new AppError(500, error.message);
    return this.normalize(data as FeatureUsageRow);
  },

  /** Read the current usage for a user + feature (no reset side effects). */
  async getUsage(
    client: SupabaseClient,
    userId: string,
    featureKey: string,
  ): Promise<FeatureUsageRow | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_id, feature_key, daily_limit, used_today, last_reset')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return data ? this.normalize(data as FeatureUsageRow) : null;
  },

  /** Normalize a snake_case DB row into the camelCase shape. */
  normalize(row: FeatureUsageRow): FeatureUsageRow {
    return {
      id: row.id,
      userId: row.user_id,
      featureKey: row.feature_key,
      dailyLimit: row.daily_limit,
      usedToday: row.used_today,
      lastReset: row.last_reset,
    };
  },
};

interface FeatureUsageRow {
  id: string;
  user_id: string;
  feature_key: string;
  daily_limit: number;
  used_today: number;
  last_reset: string;
}
