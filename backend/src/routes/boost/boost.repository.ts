import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../utils/errors';

/**
 * Boost repository — the query layer for `boost_sessions`.
 *
 * Why: Owns all raw Supabase access for boosts. Exposes:
 *  - `getActiveBoost` — the caller's currently active (non-expired) boost.
 *  - `createBoost` — insert a new active boost.
 *  - `expireBoost` — mark a boost expired (sweep).
 *  - `getActiveBoostsForCandidates` — read active boosts for a set of candidate
 *    user ids so the recommendation engine can apply multipliers. This is the
 *    single read path the engine uses; it never touches the table directly.
 */
const TABLE = 'boost_sessions';

export const boostRepository = {
  /** The caller's active boost (status='active' and not expired), if any. */
  async getActiveBoost(
    client: SupabaseClient,
    userId: string,
  ): Promise<BoostRow | null> {
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, user_id, started_at, expires_at, boost_multiplier, status, created_at',
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', now)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return data ? (data as BoostRow) : null;
  },

  /** Insert a new active boost. Caller must have checked for an existing one. */
  async createBoost(
    client: SupabaseClient,
    userId: string,
    expiresAt: string,
    multiplier: number,
  ): Promise<BoostRow> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        user_id: userId,
        expires_at: expiresAt,
        boost_multiplier: multiplier,
        status: 'active',
      })
      .select(
        'id, user_id, started_at, expires_at, boost_multiplier, status, created_at',
      )
      .single();
    if (error) throw new AppError(500, error.message);
    return data as BoostRow;
  },

  /** Mark a boost as expired (used by the sweep). */
  async expireBoost(
    client: SupabaseClient,
    id: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ status: 'expired' })
      .eq('id', id);
    if (error) throw new AppError(500, error.message);
  },

  /**
   * Read active boosts for a set of candidate user ids, returning a map of
   * userId -> multiplier. Only non-expired, active boosts are included.
   */
  async getActiveBoostsForCandidates(
    client: SupabaseClient,
    candidateIds: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (candidateIds.length === 0) return result;
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(TABLE)
      .select('user_id, boost_multiplier')
      .eq('status', 'active')
      .gt('expires_at', now)
      .in('user_id', candidateIds);
    if (error) throw new AppError(500, error.message);
    for (const row of (data as Array<{ user_id: string; boost_multiplier: number }>) ?? []) {
      result.set(row.user_id, Number(row.boost_multiplier));
    }
    return result;
  },
};

export interface BoostRow {
  id: string;
  user_id: string;
  started_at: string;
  expires_at: string;
  boost_multiplier: number;
  status: 'active' | 'expired' | 'canceled';
  created_at: string;
}
