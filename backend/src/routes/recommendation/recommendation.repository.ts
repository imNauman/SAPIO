import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { Gender, RelationshipGoal } from '../profile/profile.types';
import {
  DEFAULT_PREFERENCES,
  UserPreferences,
} from './recommendation.types';

/**
 * Recommendation repository — the query layer.
 *
 * Why: All raw Supabase access for the recommendation engine lives here so the
 * service stays declarative. It is intentionally independent of the discovery
 * module: it owns the exclusion set, the preference load, the filtered candidate
 * query (with photo counts), and cursor pagination. The service orchestrates
 * these and hands rows to the scoring strategy. No ML/AI here.
 */
const PROFILES = 'profiles';
const PHOTOS = 'profile_photos';
// Canonical discovery-filter table (migration 0016). Replaces the legacy
// user_preferences as the single source of truth for the Recommendation Engine.
const PREFERENCES = 'discovery_preferences';
const SWIPES = 'swipes';
const MATCHES = 'matches';
const BLOCKS = 'user_blocks';
const REPORTS = 'reports';

/** A user is "active" if seen within this window. */
export const ACTIVE_WITHIN_DAYS = 30;

interface CandidateRow {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  birth_date: string | null;
  gender: Gender | null;
  interested_in: string[];
  relationship_goal: RelationshipGoal | null;
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
  profile_completed: boolean;
  preferred_languages: string[];
  primary_photo_url: string | null;
  photo_count: number;
}

/** True when the error indicates the queried relation (table) is missing. */
function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /relation .* does not exist/i.test(msg);
}

export const recommendationRepository = {
  /**
   * Load the caller's preferences, or return sensible defaults when none exist
   * yet (so the feed always works). Never throws on a missing row.
   */
  async getPreferences(
    client: SupabaseClient,
    userId: string,
  ): Promise<UserPreferences> {
    const { data, error } = await client
      .from(PREFERENCES)
      .select(
        `id, user_id, minimum_age, maximum_age, maximum_distance_km,
         show_me_gender, relationship_goals, verified_only, show_online_only,
         hide_inactive_profiles, preferred_languages, created_at, last_updated`,
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) {
      return {
        id: '',
        userId,
        ...DEFAULT_PREFERENCES,
        createdAt: '',
        updatedAt: '',
      };
    }
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      minimumAge: row.minimum_age as number,
      maximumAge: row.maximum_age as number,
      maximumDistanceKm: row.maximum_distance_km as number,
      // Column mapping: discovery_preferences.show_me_gender -> interestedIn
      interestedIn: (row.show_me_gender as Gender[]) ?? [],
      // Column mapping: discovery_preferences.relationship_goals -> relationshipGoal
      relationshipGoal: (row.relationship_goals as RelationshipGoal) ?? null,
      // Column mapping: discovery_preferences.verified_only -> showVerifiedOnly
      showVerifiedOnly: row.verified_only as boolean,
      showOnlineOnly: row.show_online_only as boolean,
      // Column mapping: discovery_preferences.hide_inactive_profiles -> hideInactiveUsers
      hideInactiveUsers: row.hide_inactive_profiles as boolean,
      preferredLanguages: (row.preferred_languages as string[]) ?? [],
      createdAt: row.created_at as string,
      updatedAt: row.last_updated as string,
    };
  },

  /**
   * Upsert the caller's preferences. Inserts on first use, updates afterwards.
   * Returns the persisted row.
   */
  async upsertPreferences(
    client: SupabaseClient,
    userId: string,
    input: Partial<{
      minimumAge: number;
      maximumAge: number;
      maximumDistanceKm: number;
      interestedIn: Gender[];
      relationshipGoal: RelationshipGoal | null;
      showVerifiedOnly: boolean;
      showOnlineOnly: boolean;
      hideInactiveUsers: boolean;
      preferredLanguages: string[];
    }>,
  ): Promise<UserPreferences> {
    const row: Record<string, unknown> = { user_id: userId };
    if (input.minimumAge !== undefined) row.minimum_age = input.minimumAge;
    if (input.maximumAge !== undefined) row.maximum_age = input.maximumAge;
    if (input.maximumDistanceKm !== undefined)
      row.maximum_distance_km = input.maximumDistanceKm;
    // Column mapping: interestedIn -> discovery_preferences.show_me_gender
    if (input.interestedIn !== undefined) row.show_me_gender = input.interestedIn;
    // Column mapping: relationshipGoal -> discovery_preferences.relationship_goals
    if (input.relationshipGoal !== undefined)
      row.relationship_goals = input.relationshipGoal;
    // Column mapping: showVerifiedOnly -> discovery_preferences.verified_only
    if (input.showVerifiedOnly !== undefined)
      row.verified_only = input.showVerifiedOnly;
    if (input.showOnlineOnly !== undefined)
      row.show_online_only = input.showOnlineOnly;
    // Column mapping: hideInactiveUsers -> discovery_preferences.hide_inactive_profiles
    if (input.hideInactiveUsers !== undefined)
      row.hide_inactive_profiles = input.hideInactiveUsers;
    if (input.preferredLanguages !== undefined)
      row.preferred_languages = input.preferredLanguages;

    const { data, error } = await client
      .from(PREFERENCES)
      .upsert(row, { onConflict: 'user_id' })
      .select(
        `id, user_id, minimum_age, maximum_age, maximum_distance_km,
         show_me_gender, relationship_goals, verified_only, show_online_only,
         hide_inactive_profiles, preferred_languages, created_at, last_updated`,
      )
      .single();
    if (error) throw new AppError(500, error.message);
    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      userId: r.user_id as string,
      minimumAge: r.minimum_age as number,
      maximumAge: r.maximum_age as number,
      maximumDistanceKm: r.maximum_distance_km as number,
      interestedIn: (r.show_me_gender as Gender[]) ?? [],
      relationshipGoal: (r.relationship_goals as RelationshipGoal) ?? null,
      showVerifiedOnly: r.verified_only as boolean,
      showOnlineOnly: r.show_online_only as boolean,
      hideInactiveUsers: r.hide_inactive_profiles as boolean,
      preferredLanguages: (r.preferred_languages as string[]) ?? [],
      createdAt: r.created_at as string,
      updatedAt: r.last_updated as string,
    };
  },

  /**
   * Collect every user id the caller must NOT see.
   *
   * Why: Centralizes the exclusion rules from the pipeline:
   *  - self
   *  - blocked (either direction)
   *  - reported
   *  - already matched (either side)
   *  - already liked (LIKE swipe)
   *  - already passed (PASS swipe)
   * Tables are queried defensively (relation-not-found is skipped) so the
   * engine keeps working even before every table is created.
   */
  async collectExcludedUserIds(
    client: SupabaseClient,
    currentUserId: string,
  ): Promise<Set<string>> {
    const excluded = new Set<string>([currentUserId]);

    const addColumn = (
      rows: Array<Record<string, unknown>> | null,
      col: string,
    ) => {
      for (const row of rows ?? []) {
        const v = row[col];
        if (typeof v === 'string') excluded.add(v);
      }
    };

    // Swipes (LIKE + PASS) made by the caller.
    try {
      const { data, error } = await client
        .from(SWIPES)
        .select('to_user_id')
        .eq('from_user_id', currentUserId);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      } else {
        addColumn(data as Array<Record<string, unknown>>, 'to_user_id');
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // Matches where the caller is either participant.
    try {
      const { data, error } = await client
        .from(MATCHES)
        .select('user_one_id, user_two_id')
        .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      } else {
        for (const row of (data as Array<Record<string, string>>) ?? []) {
          if (row.user_one_id) excluded.add(row.user_one_id);
          if (row.user_two_id) excluded.add(row.user_two_id);
        }
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // Blocks (either direction hides both users). Uses the canonical
    // `user_blocks` table; a block in either direction removes the other user
    // from the caller's feed immediately.
    try {
      const { data, error } = await client
        .from(BLOCKS)
        .select('blocker_user_id, blocked_user_id')
        .or(`blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${currentUserId}`);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      }
      for (const row of (data as Array<Record<string, string>>) ?? []) {
        if (row.blocker_user_id) excluded.add(row.blocker_user_id);
        if (row.blocked_user_id) excluded.add(row.blocked_user_id);
      }
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    // Reports made by the caller.
    try {
      const { data, error } = await client
        .from(REPORTS)
        .select('reported_user_id')
        .eq('reporter_user_id', currentUserId);
      if (error) {
        if (!isMissingTable(error)) throw new AppError(500, error.message);
      }
      addColumn(data as Array<Record<string, unknown>>, 'reported_user_id');
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }

    return excluded;
  },

  /** Read the caller's own coordinates for distance scoring. */
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

  /**
   * Fetch candidate profiles that pass the hard filters, with photo counts.
   *
   * Hard filters applied in SQL (cheap, index-friendly):
   *  - profile_completed = true
   *  - discoverable = true (respects the user's privacy toggle)
   *  - deleted_at is null (excludes soft-deleted accounts)
   *  - has a primary photo (inner join via is_primary)
   *  - not the caller
   *  - not in the excluded set
   *  - (optional) gender in interested_in
   *  - (optional) relationship_goal matches
   *  - (optional) verified only
   *  - (optional) active only (hide_inactive_users)
   * Age/distance are scored (not hard-filtered) so candidates slightly outside
   * the band still appear, just ranked lower. Ordered by id for stable keyset
   * pagination; `cursor` excludes ids <= it.
   */
  async getCandidates(
    client: SupabaseClient,
    currentUserId: string,
    excluded: Set<string>,
    prefs: UserPreferences,
    cursor: string | undefined,
    limit: number,
  ): Promise<CandidateRow[]> {
    const activeCutoff = new Date(
      Date.now() - ACTIVE_WITHIN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    let query = client
      .from(PROFILES)
      .select(
        `id, user_id, display_name, username, birth_date, gender, interested_in,
         relationship_goal, occupation, education, city, country, bio,
         is_verified, is_premium, last_active, latitude, longitude,
         profile_completed, preferred_languages,
         primary_photo_url:${PHOTOS}(photo_url, is_primary),
         photo_count:${PHOTOS}(count)`,
      )
      .eq('profile_completed', true)
      .eq('discoverable', true)
      .is('deleted_at', null)
      .eq(`${PHOTOS}.is_primary`, true)
      .neq('user_id', currentUserId)
      .order('id', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query.gt('id', cursor);
    }
    if (excluded.size > 0) {
      query = query.not('user_id', 'in', `(${[...excluded].join(',')})`);
    }
    if (prefs.interestedIn.length > 0) {
      query = query.in('gender', prefs.interestedIn as string[]);
    }
    if (prefs.relationshipGoal) {
      query = query.eq('relationship_goal', prefs.relationshipGoal);
    }
    if (prefs.showVerifiedOnly) {
      query = query.eq('is_verified', true);
    }
    if (prefs.hideInactiveUsers) {
      query = query.gte('last_active', activeCutoff);
    }

    const { data, error } = await query;
    if (error) throw new AppError(500, error.message);
    return (data as unknown as CandidateRow[]) ?? [];
  },
};

export { supabaseAdmin };

