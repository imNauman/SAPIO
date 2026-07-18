import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../utils/errors';

/**
 * Super Like repository — the query layer for `super_likes`.
 *
 * Why: Owns all raw Supabase access for super-like events. The swipe itself is
 * persisted by the swipe repository (reusing the swipe engine); this layer
 * records the `super_likes` event for notification + recommendation priority and
 * reads history. Duplicate prevention is enforced by the unique DB index
 * (`super_likes_unique_pair_idx`); a duplicate insert surfaces as a 409 from the
 * database and is translated by the service.
 */
const TABLE = 'super_likes';

/** True when the error indicates a unique-constraint violation. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

export const superLikeRepository = {
  /**
   * Record a super-like event. Throws `conflict` (409) on a duplicate pair
   * (the caller already super-liked this target). The swipe row is written by
   * the swipe repository before this is called.
   */
  async createSuperLike(
    client: SupabaseClient,
    fromUserId: string,
    toUserId: string,
  ): Promise<SuperLikeRow> {
    const { data, error } = await client
      .from(TABLE)
      .insert({ from_user_id: fromUserId, to_user_id: toUserId })
      .select('id, from_user_id, to_user_id, created_at')
      .single();
    if (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'You have already super liked this user.');
      }
      throw new AppError(500, error.message);
    }
    return data as SuperLikeRow;
  },

  /** The caller's sent super-like history (most recent first). */
  async getHistory(
    client: SupabaseClient,
    fromUserId: string,
  ): Promise<SuperLikeRow[]> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, from_user_id, to_user_id, created_at')
      .eq('from_user_id', fromUserId)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(500, error.message);
    return (data as SuperLikeRow[]) ?? [];
  },

  /**
   * Read the set of user ids who have super-liked the given viewer. Used by the
   * recommendation engine to prioritize those candidates. Returns a Set.
   */
  async getSuperLikersForViewer(
    client: SupabaseClient,
    viewerId: string,
  ): Promise<Set<string>> {
    const { data, error } = await client
      .from(TABLE)
      .select('from_user_id')
      .eq('to_user_id', viewerId);
    if (error) throw new AppError(500, error.message);
    const set = new Set<string>();
    for (const row of (data as Array<{ from_user_id: string }>) ?? []) {
      set.add(row.from_user_id);
    }
    return set;
  },
};

interface SuperLikeRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}
