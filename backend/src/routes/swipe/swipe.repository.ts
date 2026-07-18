import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import {
  SwipeActionType,
  SwipeHistoryItem,
  SwipeRecord,
} from './swipe.types';

/**
 * Swipe repository — the query layer.
 *
 * Why: All raw Supabase access for swipes lives here. The service stays
 * declarative and never touches the client directly. We use the admin client so
 * server-side writes bypass RLS (the request is already authenticated and the
 * `from_user_id` is forced to the caller). Duplicate prevention is enforced by
 * the unique index `swipes_unique_pair_idx`; a 409 is returned on conflict.
 */
const TABLE = 'swipes';

/** Detect a unique-violation (duplicate pair) error from Postgres. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

export const swipeRepository = {
  /**
   * Record a swipe. Throws 409 on a duplicate (same from/to pair) and 404 if
   * the target user does not exist. Does NOT create a match.
   */
  async createSwipe(
    client: SupabaseClient,
    fromUserId: string,
    toUserId: string,
    action: SwipeActionType,
  ): Promise<SwipeRecord> {
    // Guard: target must be a real user.
    const { data: target, error: targetErr } = await client
      .from('profiles')
      .select('user_id')
      .eq('user_id', toUserId)
      .maybeSingle();
    if (targetErr) throw new AppError(500, targetErr.message);
    if (!target) throw new AppError(404, 'Target user not found');

    const { data, error } = await client
      .from(TABLE)
      .insert({ from_user_id: fromUserId, to_user_id: toUserId, action })
      .select('id, from_user_id, to_user_id, action, created_at')
      .single();

    if (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'You have already swiped this user');
      }
      throw new AppError(500, error.message);
    }

    const row = data as {
      id: string;
      from_user_id: string;
      to_user_id: string;
      action: SwipeActionType;
      created_at: string;
    };
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      action: row.action,
      createdAt: row.created_at,
    };
  },

  /** Fetch the caller's swipe history, newest first. */
  async getHistory(
    client: SupabaseClient,
    fromUserId: string,
    limit = 50,
  ): Promise<SwipeHistoryItem[]> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, to_user_id, action, created_at')
      .eq('from_user_id', fromUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new AppError(500, error.message);
    return ((data as unknown[]) ?? []).map(
      (r) => {
        const row = r as {
          id: string;
          to_user_id: string;
          action: SwipeActionType;
          created_at: string;
        };
        return {
          id: row.id,
          toUserId: row.to_user_id,
          action: row.action,
          createdAt: row.created_at,
        };
      },
    );
  },

  /** Delete a swipe by id (undo). Only succeeds if it belongs to the caller. */
  async deleteSwipe(
    client: SupabaseClient,
    id: string,
    fromUserId: string,
  ): Promise<void> {
    const { error, count } = await client
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('from_user_id', fromUserId);

    if (error) throw new AppError(500, error.message);
    if (!count || count === 0) {
      throw new AppError(404, 'Swipe not found');
    }
  },

  /** Read a minimal profile (display name) for a user id, or null if missing. */
  async getTargetProfile(
    client: SupabaseClient,
    userId: string,
  ): Promise<{ displayName: string | null } | null> {
    const { data, error } = await client
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    return { displayName: (data as { display_name: string | null }).display_name };
  },
};

export { supabaseAdmin };
