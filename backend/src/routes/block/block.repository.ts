import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { BlockRecord, BlockedUser } from './block.types';

/**
 * Block repository — the query layer.
 *
 * Why: All raw Supabase access for blocking lives here so the service stays
 * declarative. The table is `user_blocks` (canonical, from migration 0008),
 * which supersedes the legacy `blocks` table. The unique pair index makes
 * inserts idempotent; a duplicate returns the existing row rather than a 409.
 * We also expose `isBlockedEitherWay` — the single reusable helper every other
 * module calls to decide whether two users are mutually invisible.
 */
const TABLE = 'user_blocks';
const PROFILES = 'profiles';
const PHOTOS = 'profile_photos';

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

interface BlockRow {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
}

export const blockRepository = {
  /**
   * Create a block (idempotent). If the pair is already blocked we return the
   * existing row instead of throwing. Returns the persisted record.
   */
  async createBlock(
    client: SupabaseClient,
    blockerUserId: string,
    blockedUserId: string,
    reason?: string,
  ): Promise<BlockRecord> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        blocker_user_id: blockerUserId,
        blocked_user_id: blockedUserId,
        reason: reason ?? null,
      })
      .select('id, blocker_user_id, blocked_user_id, reason, created_at')
      .single();

    if (error) {
      if (isDuplicateKey(error)) {
        // Already blocked — fetch and return the existing row.
        const existing = await this.findBlock(
          client,
          blockerUserId,
          blockedUserId,
        );
        if (existing) return existing;
      }
      throw new AppError(500, error.message);
    }

    const row = data as BlockRow;
    return {
      id: row.id,
      blockerUserId: row.blocker_user_id,
      blockedUserId: row.blocked_user_id,
      reason: row.reason,
      createdAt: row.created_at,
    };
  },

  /** Find an existing block in either direction (or null). */
  async findBlock(
    client: SupabaseClient,
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<BlockRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('id, blocker_user_id, blocked_user_id, reason, created_at')
      .or(
        `and(blocker_user_id.eq.${blockerUserId},blocked_user_id.eq.${blockedUserId}),` +
          `and(blocker_user_id.eq.${blockedUserId},blocked_user_id.eq.${blockerUserId})`,
      )
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw new AppError(500, error.message);
    }
    if (!data) return null;
    const row = data as BlockRow;
    return {
      id: row.id,
      blockerUserId: row.blocker_user_id,
      blockedUserId: row.blocked_user_id,
      reason: row.reason,
      createdAt: row.created_at,
    };
  },

  /** Delete a block by the blocked user's id (caller = blocker). */
  async deleteBlock(
    client: SupabaseClient,
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<void> {
    const { error, count } = await client
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('blocker_user_id', blockerUserId)
      .eq('blocked_user_id', blockedUserId);
    if (error) throw new AppError(500, error.message);
    if (!count || count === 0) {
      throw new AppError(404, 'Block not found');
    }
  },

  /** List the caller's blocked users, enriched with minimal profile info. */
  async listBlocks(
    client: SupabaseClient,
    blockerUserId: string,
  ): Promise<BlockedUser[]> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        `id, blocked_user_id, reason, created_at,
         display_name:${PROFILES}(display_name, username,
           primary_photo_url:${PHOTOS}(photo_url, is_primary))`,
      )
      .eq('blocker_user_id', blockerUserId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTable(error)) return [];
      throw new AppError(500, error.message);
    }

    return ((data as unknown[]) ?? []).map((r) => {
      const row = r as {
        id: string;
        blocked_user_id: string;
        reason: string | null;
        created_at: string;
        display_name: {
          display_name: string | null;
          username: string | null;
          primary_photo_url: Array<{ photo_url: string }> | null;
        } | null;
      };
      return {
        id: row.id,
        blockedUserId: row.blocked_user_id,
        reason: row.reason,
        createdAt: row.created_at,
        displayName: row.display_name?.display_name ?? null,
        username: row.display_name?.username ?? null,
        primaryPhotoUrl:
          row.display_name?.primary_photo_url?.[0]?.photo_url ?? null,
      };
    });
  },

  /**
   * Reusable visibility helper: are `a` and `b` blocked in EITHER direction?
   * Returns true if either user has blocked the other. Every module that decides
   * "should these two users see each other?" calls this — no logic duplicated.
   */
  async isBlockedEitherWay(
    client: SupabaseClient,
    a: string,
    b: string,
  ): Promise<boolean> {
    const { data, error } = await client
      .from(TABLE)
      .select('id')
      .or(
        `and(blocker_user_id.eq.${a},blocked_user_id.eq.${b}),` +
          `and(blocker_user_id.eq.${b},blocked_user_id.eq.${a})`,
      )
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return false;
      throw new AppError(500, error.message);
    }
    return Boolean(data);
  },
};

export { supabaseAdmin };
