import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { MatchRecord } from './match.types';

/**
 * Match repository — the query layer.
 *
 * Why: All raw Supabase access for matches lives here. The service stays
 * declarative and never touches the client directly. We use the admin client so
 * server-side writes bypass RLS (the request is already authenticated and the
 * participant ids are forced by the service). Duplicate prevention is enforced
 * by the unique index `matches_unique_pair_idx`; a 409 is returned on conflict.
 *
 * Ordering rule: user_one_id is always the lexicographically smaller UUID, so a
 * mutual like detected in either direction maps to the same row.
 */
const TABLE = 'matches';
const PROFILES = 'profiles';
const PHOTOS = 'profile_photos';

/** Order two user ids deterministically: [smaller, larger]. */
export function orderPair(
  a: string,
  b: string,
): { userOneId: string; userTwoId: string } {
  return a < b
    ? { userOneId: a, userTwoId: b }
    : { userOneId: b, userTwoId: a };
}

/** Detect a unique-violation (duplicate pair) error from Postgres. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

interface MatchRow {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
  matched_at: string;
  is_active: boolean;
}

export const matchRepository = {
  /**
   * Create a match for the ordered pair. Throws 409 if the pair already exists
   * (a match was created by the other user first). Returns the created row.
   */
  async createMatch(
    client: SupabaseClient,
    userOneId: string,
    userTwoId: string,
  ): Promise<MatchRecord> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        user_one_id: userOneId,
        user_two_id: userTwoId,
        is_active: true,
      })
      .select('id, user_one_id, user_two_id, created_at, matched_at, is_active')
      .single();

    if (error) {
      if (isDuplicateKey(error)) {
        throw new AppError(409, 'Match already exists');
      }
      throw new AppError(500, error.message);
    }

    const row = data as MatchRow;
    return {
      id: row.id,
      userOneId: row.user_one_id,
      userTwoId: row.user_two_id,
      createdAt: row.created_at,
      matchedAt: row.matched_at,
      isActive: row.is_active,
    };
  },

  /**
   * Find an existing match between two users (either order). Returns null if
   * none. Used to detect a duplicate before/after insert.
   */
  async findMatch(
    client: SupabaseClient,
    userOneId: string,
    userTwoId: string,
  ): Promise<MatchRecord | null> {
    const { userOneId: a, userTwoId: b } = orderPair(userOneId, userTwoId);
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_one_id, user_two_id, created_at, matched_at, is_active')
      .eq('user_one_id', a)
      .eq('user_two_id', b)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    const row = data as MatchRow;
    return {
      id: row.id,
      userOneId: row.user_one_id,
      userTwoId: row.user_two_id,
      createdAt: row.created_at,
      matchedAt: row.matched_at,
      isActive: row.is_active,
    };
  },

  /**
   * Did `targetUserId` already LIKE `currentUserId`? Returns true only if a
   * LIKE swipe exists from target -> current. PASS actions are ignored, and a
   * missing `swipes` table degrades gracefully (no match possible yet).
   */
  async hasLiked(
    client: SupabaseClient,
    fromUserId: string,
    toUserId: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await client
        .from('swipes')
        .select('id')
        .eq('from_user_id', fromUserId)
        .eq('to_user_id', toUserId)
        .eq('action', 'LIKE')
        .maybeSingle();
      if (error) {
        if (isMissingTable(error)) return false;
        throw new AppError(500, error.message);
      }
      return Boolean(data);
    } catch (err) {
      if (isMissingTable(err)) return false;
      throw err;
    }
  },

  /**
   * Fetch all matches for a user, newest first, enriched with the other
   * participant's profile + primary photo. Inactive/blocked/deleted profiles
   * are skipped (we only return matches whose counterpart is a real, active,
   * non-blocked, non-deleted profile).
   */
  async getMatchesForUser(
    client: SupabaseClient,
    currentUserId: string,
  ): Promise<MatchRecord[]> {
    // Fetch matches where the user is either participant.
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_one_id, user_two_id, created_at, matched_at, is_active')
      .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTable(error)) return [];
      throw new AppError(500, error.message);
    }
    return ((data as unknown[]) ?? []).map((r) => {
      const row = r as MatchRow;
      return {
        id: row.id,
        userOneId: row.user_one_id,
        userTwoId: row.user_two_id,
        createdAt: row.created_at,
        matchedAt: row.matched_at,
        isActive: row.is_active,
      };
    });
  },

  /** Fetch a single match by id (ownership is checked by the service). */
  async getMatchById(
    client: SupabaseClient,
    id: string,
  ): Promise<MatchRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_one_id, user_two_id, created_at, matched_at, is_active')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    const row = data as MatchRow;
    return {
      id: row.id,
      userOneId: row.user_one_id,
      userTwoId: row.user_two_id,
      createdAt: row.created_at,
      matchedAt: row.matched_at,
      isActive: row.is_active,
    };
  },

  /** Hard-delete a match by id. */
  async deleteMatch(client: SupabaseClient, id: string): Promise<void> {
    const { error, count } = await client
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new AppError(500, error.message);
    if (!count || count === 0) {
      throw new AppError(404, 'Match not found');
    }
  },

  /**
   * Find a match between two users in EITHER direction (or null). Used by the
   * block service to archive a shared thread regardless of who liked whom first.
   */
  async findMatchBetween(
    client: SupabaseClient,
    a: string,
    b: string,
  ): Promise<MatchRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, user_one_id, user_two_id, created_at, matched_at, is_active')
      .or(`and(user_one_id.eq.${a},user_two_id.eq.${b}),and(user_one_id.eq.${b},user_two_id.eq.${a})`)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    const row = data as MatchRow;
    return {
      id: row.id,
      userOneId: row.user_one_id,
      userTwoId: row.user_two_id,
      createdAt: row.created_at,
      matchedAt: row.matched_at,
      isActive: row.is_active,
    };
  },

  /** Bulk-archive matches (set is_active = false) by ids. */
  async archiveMatches(
    client: SupabaseClient,
    ids: string[],
  ): Promise<number> {
    const { error, count } = await client
      .from(TABLE)
      .update({ is_active: false })
      .in('id', ids);
    if (error) throw new AppError(500, error.message);
    return count ?? 0;
  },

  /**
   * Fetch the counterpart profile for a match, or null if the counterpart is
   * missing, inactive, blocked, or deleted. This is how we "ignore inactive /
   * blocked / deleted profiles" in the match list.
   */
  async getCounterpartProfile(
    client: SupabaseClient,
    counterpartUserId: string,
    currentUserId: string,
  ): Promise<{
    userId: string;
    displayName: string | null;
    username: string | null;
    primaryPhotoUrl: string | null;
    isVerified: boolean;
    isPremium: boolean;
    lastActive: string | null;
  } | null> {
    // Counterpart must be a real, completed, active profile.
    const { data, error } = await client
      .from(PROFILES)
      .select(
        `user_id, display_name, username, is_verified, is_premium, last_active,
         primary_photo_url:${PHOTOS}(photo_url, is_primary)`,
      )
      .eq('user_id', counterpartUserId)
      .eq('profile_completed', true)
      .gte(
        'last_active',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .eq(`${PHOTOS}.is_primary`, true)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;

    // Counterpart must not have blocked the current user.
    const { data: block, error: blockErr } = await client
      .from('user_blocks')
      .select('id')
      .eq('blocker_user_id', counterpartUserId)
      .eq('blocked_user_id', currentUserId)
      .maybeSingle();
    if (blockErr) {
      if (!isMissingTable(blockErr)) throw new AppError(500, blockErr.message);
    } else if (block) {
      return null; // counterpart blocked current user -> hide match
    }

    const row = data as {
      user_id: string;
      display_name: string | null;
      username: string | null;
      is_verified: boolean;
      is_premium: boolean;
      last_active: string | null;
      primary_photo_url: Array<{ photo_url: string }> | null;
    };
    return {
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      primaryPhotoUrl: row.primary_photo_url?.[0]?.photo_url ?? null,
      isVerified: row.is_verified,
      isPremium: row.is_premium,
      lastActive: row.last_active,
    };
  },
};

export { supabaseAdmin };
