import { supabaseAdmin } from '../../config/supabase';
import { notFound } from '../../utils/errors';
import { discoveryRepository } from './discovery.repository';
import {
  DiscoveryProfile,
  FeedPage,
  FeedQuery,
} from './discovery.types';
import { recommendationService } from '../recommendation/recommendation.service';
import { profileRepo } from '../profile/profile.repository';

/**
 * Discovery service.
 *
 * Why: The Discovery Feed is now a PRESENTATION LAYER only. All ranking and
 * inclusion logic lives in the Recommendation Engine (`recommendationService`),
 * which is the single source of truth for which profiles appear and in what
 * order. This service delegates `getFeed` to the engine and maps the returned
 * `RecommendedProfile` cards into the client-friendly `DiscoveryProfile` shape
 * the mobile deck already consumes. The frontend never decides ordering.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Map an engine recommendation into the legacy discovery card shape. */
function toDiscoveryProfile(p: {
  id: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  age: number | null;
  gender: DiscoveryProfile['gender'];
  occupation: string | null;
  education: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  primaryPhotoUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
  isOnline: boolean;
  distanceKm: number | null;
}): DiscoveryProfile {
  return {
    id: p.id,
    userId: p.userId,
    displayName: p.displayName,
    username: p.username,
    age: p.age,
    gender: p.gender,
    occupation: p.occupation,
    education: p.education,
    city: p.city,
    country: p.country,
    bio: p.bio,
    primaryPhotoUrl: p.primaryPhotoUrl,
    isVerified: p.isVerified,
    isPremium: p.isPremium,
    isOnline: p.isOnline,
    distanceKm: p.distanceKm,
  };
}

export const discoveryService = {
  /** Build a page of the feed for the caller (delegates to the engine). */
  async getFeed(currentUserId: string, query: FeedQuery): Promise<FeedPage> {
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    // Opening the feed counts as activity (drives the "hide inactive" filter).
    await profileRepo.touchActivity(currentUserId).catch(() => {});

    const page = await recommendationService.getRecommendations(
      currentUserId,
      { cursor: query.cursor, limit },
    );

    const profiles = page.profiles.map(toDiscoveryProfile);
    return {
      profiles,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  },

  /** Single candidate detail (used by the card's "view profile" later). */
  async getProfileById(
    currentUserId: string,
    id: string,
  ): Promise<DiscoveryProfile> {
    const row = await discoveryRepository.getCandidateById(supabaseAdmin, id);
    if (!row) throw notFound('Profile not found');
    const excluded = await discoveryRepository.collectExcludedUserIds(
      supabaseAdmin,
      currentUserId,
    );
    if (excluded.has(row.user_id)) throw notFound('Profile not available');
    return toDiscoveryProfile({
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      age: row.birth_date ? computeAge(row.birth_date) : null,
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
        ? Date.now() - new Date(row.last_active).getTime() < 10 * 60 * 1000
        : false,
      distanceKm: null,
    });
  },
};

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
