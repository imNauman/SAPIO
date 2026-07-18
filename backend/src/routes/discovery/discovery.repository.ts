import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { Gender } from '../profile/profile.types';

/**
 * Discovery repository — the query layer.
 *
 * Why: All raw Supabase queries live here so the service stays declarative.
 * The feed query joins `profiles` to the candidate's primary photo and applies
 * the hard filters that are possible with the current schema (completed
 * profile, has a primary photo, active, not the caller). Exclusions for
 * future tables (likes/passes/matches/blocks/reports) are collected by
 * `collectExcludedUserIds`, which degrades gracefully until those tables exist.
 */
const PROFILES = 'profiles';
const PHOTOS = 'profile_photos';

/** A user is "active" if they were seen within this window. */
export const ACTIVE_WITHIN_DAYS = 30;

interface CandidateRow {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  birth_date: string | null;
  gender: Gender | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  is_verified: boolean;
  is_premium: boolean;
  last_active: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_photo_url: string | null;
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

export const discoveryRepository = {
  /**
   * Fetch candidate profiles for the feed.
   *
   * Filters applied in SQL:
   *  - profile_completed = true
   *  - has a primary photo (inner-ish via left join + not null)
   *  - active within the window
   *  - not the caller
   *  - not in the excluded set
   * Ordered by id for stable keyset pagination; `cursor` excludes ids <= it.
   */
  async getCandidates(
    client: SupabaseClient,
    currentUserId: string,
    excluded: Set<string>,
    cursor: string | undefined,
    limit: number,
  ): Promise<CandidateRow[]> {
    let query = client
      .from(PROFILES)
      .select(
        `id, user_id, display_name, username, birth_date, gender, occupation,
         education, city, country, bio, is_verified, is_premium, last_active,
         latitude, longitude,
         primary_photo_url:${PHOTOS}(photo_url, is_primary)`,
      )
      .eq('profile_completed', true)
      .eq(`${PHOTOS}.is_primary`, true)
      .gte(
        'last_active',
        new Date(
          Date.now() - ACTIVE_WITHIN_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString(),
      )
      .neq('user_id', currentUserId)
      .order('id', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query.gt('id', cursor);
    }
    if (excluded.size > 0) {
      query = query.not('user_id', 'in', `(${[...excluded].join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw new AppError(500, error.message);
    return (data as unknown as CandidateRow[]) ?? [];
  },

  /**
   * Collect user ids the caller must not see.
   *
   * Why: Centralizes the "don't show X" rules. The current user is always
   * excluded. The future swipe/match/block/report tables are queried
   * defensively — if a table isn't created yet we skip it (relation-not-found)
   * so the feed keeps working until those milestones land.
   */
  async collectExcludedUserIds(
    client: SupabaseClient,
    currentUserId: string,
  ): Promise<Set<string>> {
    const excluded = new Set<string>([currentUserId]);

    // --- Swipes: any LIKE or PASS already made by the caller hides that
    // candidate from the feed. The `swipes` table now exists. ---
    try {
      const { data, error } = await client
        .from('swipes')
        .select('to_user_id')
        .eq('from_user_id', currentUserId);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      } else {
        for (const row of (data as unknown as Array<Record<string, string>>) ?? []) {
          if (row.to_user_id) excluded.add(row.to_user_id);
        }
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // --- Matches: exclude the counterpart in either direction. ---
    try {
      const { data, error } = await client
        .from('matches')
        .select('user_one_id, user_two_id')
        .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      } else {
        for (const row of (data as unknown as Array<Record<string, string>>) ?? []) {
          if (row.user_one_id) excluded.add(row.user_one_id);
          if (row.user_two_id) excluded.add(row.user_two_id);
        }
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // --- Blocks: a block in either direction hides the other user. ---
    // Delegated to the shared block repository so the rule lives in one place.
    try {
      const { data, error } = await client
        .from('user_blocks')
        .select('blocker_user_id, blocked_user_id')
        .or(`blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      } else {
        for (const row of (data as unknown as Array<Record<string, string>>) ?? []) {
          if (row.blocker_user_id) excluded.add(row.blocker_user_id);
          if (row.blocked_user_id) excluded.add(row.blocked_user_id);
        }
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    return excluded;
  },

  /** Read the caller's own coordinates for distance computation. */
  async getViewerLocation(
    client: SupabaseClient,
    currentUserId: string,
  ): Promise<{ latitude: number | null; longitude: number | null }> {
    const { data, error } = await client
      .from(PROFILES)
      .select('latitude, longitude')
      .eq('user_id', currentUserId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    const row = data as { latitude: number | null; longitude: number | null } | null;
    return { latitude: row?.latitude ?? null, longitude: row?.longitude ?? null };
  },

  /** Fetch a single candidate profile by id (for the detail view). */
  async getCandidateById(
    client: SupabaseClient,
    id: string,
  ): Promise<CandidateRow | null> {
    const { data, error } = await client
      .from(PROFILES)
      .select(
        `id, user_id, display_name, username, birth_date, gender, occupation,
         education, city, country, bio, is_verified, is_premium, last_active,
         latitude, longitude,
         primary_photo_url:${PHOTOS}(photo_url, is_primary)`,
      )
      .eq('id', id)
      .eq('discoverable', true)
      .is('deleted_at', null)
      .eq(`${PHOTOS}.is_primary`, true)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    return (data as unknown as CandidateRow) ?? null;
  },
};

export { supabaseAdmin };
