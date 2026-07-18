import { supabaseAdmin } from '../../config/supabase';
import { recommendationRepository } from './recommendation.repository';
import {
  createRecommendationStrategy,
  CandidateFacts,
  RecommendationStrategy,
} from './recommendation.strategy';
import {
  RecommendationPage,
  RecommendationQuery,
  RecommendedProfile,
  UpdatePreferencesInput,
  UserPreferences,
} from './recommendation.types';
import { Gender } from '../profile/profile.types';
import { boostRepository } from '../boost/boost.repository';
import { superLikeRepository } from '../superlike/superlike.repository';
import { haversineDistance } from '../../services/geo.service';
import { subscriptionRepository } from '../subscription/subscription.repository';

/** Free users are capped at this discovery radius (Premium = unlimited). */
export const FREE_MAX_DISTANCE_KM = 100;

/**
 * Recommendation service — the engine.
 *
 * Why: This is the ONLY source of truth for which profiles appear in the feed
 * and in what order. The pipeline is:
 *   1. load preferences
 *   2. exclude (self, blocked, reported, matched, liked, passed, deleted,
 *      inactive, incomplete, no primary photo)
 *   3. filter (gender, relationship goal, verified, active) — age/distance are
 *      scored, not hard-filtered
 *   4. score each candidate via the injected `RecommendationStrategy`
 *   5. sort descending by totalScore
 *   6. return top N (cursor-paginated)
 *
 * The service depends only on the `RecommendationStrategy` interface, so a
 * future AI strategy can replace `DeterministicRecommendationStrategy` without
 * any change here, in controllers, or in the mobile client. Results are cached
 * per user (in-memory, short TTL) to avoid re-scoring on every poll.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CACHE_TTL_MS = 30 * 1000;

function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

interface CacheEntry {
  page: RecommendationPage;
  at: number;
}
const cache = new Map<string, CacheEntry>();

export const recommendationService = {
  /** The active strategy (swap point for a future AI model). */
  strategy: createRecommendationStrategy() as RecommendationStrategy,

  /** GET /recommendations — the ranked, paginated feed. */
  async getRecommendations(
    currentUserId: string,
    query: RecommendationQuery,
  ): Promise<RecommendationPage> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const cacheKey = `${currentUserId}:${query.cursor ?? 'first'}:${limit}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.page;
    }

    const prefs = await recommendationRepository.getPreferences(
      supabaseAdmin,
      currentUserId,
    );
    const excluded = await recommendationRepository.collectExcludedUserIds(
      supabaseAdmin,
      currentUserId,
    );
    const viewer = await recommendationRepository.getViewerLocation(
      supabaseAdmin,
      currentUserId,
    );

    const rows = await recommendationRepository.getCandidates(
      supabaseAdmin,
      currentUserId,
      excluded,
      prefs,
      query.cursor,
      limit * 3, // over-fetch so scoring + sort has enough to fill `limit`
    );

    // Boost + Super Like signals (reuse the dedicated repositories; the engine
    // only READS these — it never writes boost/super-like state).
    const candidateIds = rows.map((r) => r.user_id);
    const boostMap = await boostRepository.getActiveBoostsForCandidates(
      supabaseAdmin,
      candidateIds,
    );
    const superLikers = await superLikeRepository.getSuperLikersForViewer(
      supabaseAdmin,
      currentUserId,
    );

    const facts: Array<{ facts: CandidateFacts; preferences: UserPreferences }> =
      rows.map((r) => ({
        facts: {
          userId: r.user_id,
          age: computeAge(r.birth_date),
          gender: r.gender,
          interestedIn: (r.interested_in as Gender[]) ?? [],
          relationshipGoal: r.relationship_goal,
          latitude: r.latitude,
          longitude: r.longitude,
          isVerified: r.is_verified,
          isPremium: r.is_premium,
          lastActive: r.last_active,
          photoCount: Array.isArray(r.photo_count)
            ? Number((r.photo_count[0] as { count: number })?.count ?? 0)
            : Number(r.photo_count ?? 0),
          profileCompleted: r.profile_completed,
          preferredLanguages: (r.preferred_languages as string[]) ?? [],
          viewerLatitude: viewer.latitude,
          viewerLongitude: viewer.longitude,
          boostMultiplier: boostMap.get(r.user_id) ?? 1,
          superLikedMe: superLikers.has(r.user_id),
        },
        preferences: prefs,
      }));

    const ranked = this.strategy.rank(facts).slice(0, limit);

    const profiles: RecommendedProfile[] = ranked.map(({ facts: f, score }) => {
      const row = rows.find((x) => x.user_id === f.userId)!;
      return {
        id: row.id,
        userId: row.user_id,
        displayName: row.display_name,
        username: row.username,
        age: computeAge(row.birth_date),
        gender: row.gender,
        occupation: row.occupation,
        education: row.education,
        city: row.city,
        country: row.country,
        bio: row.bio,
        primaryPhotoUrl: row.primary_photo_url,
        isVerified: row.is_verified,
        isPremium: row.is_premium,
        isOnline: row.last_active
          ? Date.now() - new Date(row.last_active).getTime() <
            10 * 60 * 1000
          : false,
        distanceKm: haversineDistance(
          viewer.latitude,
          viewer.longitude,
          row.latitude,
          row.longitude,
        ),
        score,
      };
    });

    const nextCursor =
      profiles.length > 0 ? profiles[profiles.length - 1].id : null;
    const page: RecommendationPage = {
      profiles,
      nextCursor,
      hasMore: profiles.length === limit,
    };

    cache.set(cacheKey, { page, at: Date.now() });
    return page;
  },

  /** GET /recommendations/refresh — fresh first page (bypass cache). */
  async refreshRecommendations(currentUserId: string): Promise<RecommendationPage> {
    // Clear this user's cached pages so the next poll is recomputed.
    for (const key of [...cache.keys()]) {
      if (key.startsWith(`${currentUserId}:`)) cache.delete(key);
    }
    return this.getRecommendations(currentUserId, {});
  },

  /** GET /recommendations/preferences — current preferences (defaults if none). */
  async getPreferences(currentUserId: string): Promise<UserPreferences> {
    return recommendationRepository.getPreferences(supabaseAdmin, currentUserId);
  },

  /** PUT /recommendations/preferences — upsert preferences. */
  async updatePreferences(
    currentUserId: string,
    input: UpdatePreferencesInput,
  ): Promise<UserPreferences> {
    // Premium gating: Free users cannot request a radius larger than the cap.
    // Premium (any non-Free active plan) is unlimited. We resolve this
    // dynamically from the subscription tables — no hardcoded tier logic.
    let maxDistance = input.maximumDistanceKm;
    if (maxDistance != null && maxDistance > FREE_MAX_DISTANCE_KM) {
      const sub = await subscriptionRepository.getActiveSubscription(
        supabaseAdmin,
        currentUserId,
      );
      const isPremium = sub != null && sub.plan.tier !== 'free';
      if (!isPremium) {
        maxDistance = FREE_MAX_DISTANCE_KM;
      }
    }
    const updated = await recommendationRepository.upsertPreferences(
      supabaseAdmin,
      currentUserId,
      { ...input, maximumDistanceKm: maxDistance },
    );
    // Preferences changed → invalidate cached feeds.
    for (const key of [...cache.keys()]) {
      if (key.startsWith(`${currentUserId}:`)) cache.delete(key);
    }
    return updated;
  },
};
