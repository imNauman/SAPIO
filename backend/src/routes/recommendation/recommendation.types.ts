import { z } from 'zod';
import { Gender, RelationshipGoal } from '../profile/profile.types';

/**
 * Recommendation domain types + validation.
 *
 * Why: The recommendation engine is the SINGLE source of truth for which
 * profiles appear in the Discovery Feed. The frontend never decides ordering or
 * inclusion — it only renders what this service returns. Types here are the
 * contract between the controller, service, repository, and the scoring
 * strategy. The `RecommendationStrategy` interface lets us later swap the
 * deterministic scorer for an AI model without touching controllers or the
 * mobile client.
 */

/** A candidate profile as returned to the feed (presentation-ready). */
export interface RecommendedProfile {
  id: string; // profile id
  userId: string;
  displayName: string | null;
  username: string | null;
  age: number | null;
  gender: Gender | null;
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
  /** The computed ranking score (0..100), exposed for transparency/debugging. */
  score: RecommendationScore;
}

/** The decomposed recommendation score. */
export interface RecommendationScore {
  totalScore: number;
  ageScore: number;
  distanceScore: number;
  activityScore: number;
  compatibilityScore: number;
  profileCompletionScore: number;
  photoScore: number;
  verificationScore: number;
}

/** A page of recommendations (cursor-paginated). */
export interface RecommendationPage {
  profiles: RecommendedProfile[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Query params for the paginated feed. */
export interface RecommendationQuery {
  /** Exclusive cursor: return candidates after this profile id. */
  cursor?: string;
  limit?: number;
}

/** The user's discovery preferences (mirrors `user_preferences`). */
export interface UserPreferences {
  id: string;
  userId: string;
  minimumAge: number;
  maximumAge: number;
  maximumDistanceKm: number;
  interestedIn: Gender[];
  relationshipGoal: RelationshipGoal | null;
  showVerifiedOnly: boolean;
  showOnlineOnly: boolean;
  hideInactiveUsers: boolean;
  preferredLanguages: string[];
  createdAt: string;
  updatedAt: string;
}

/** Default preferences applied when a user has none yet. */
export const DEFAULT_PREFERENCES: Omit<
  UserPreferences,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  minimumAge: 18,
  maximumAge: 99,
  maximumDistanceKm: 50,
  interestedIn: [],
  relationshipGoal: null,
  showVerifiedOnly: false,
  showOnlineOnly: false,
  hideInactiveUsers: true,
  preferredLanguages: [],
};

/** Zod schema for PUT /recommendations/preferences. */
export const updatePreferencesSchema = z.object({
  minimumAge: z.number().int().min(18).max(99).optional(),
  maximumAge: z.number().int().min(18).max(99).optional(),
  maximumDistanceKm: z.number().int().min(1).max(20000).optional(),
  interestedIn: z.array(z.enum(['male', 'female', 'non_binary', 'other'])).optional(),
  relationshipGoal: z
    .enum(['casual', 'dating', 'serious', 'friendship', 'marriage'])
    .nullable()
    .optional(),
  showVerifiedOnly: z.boolean().optional(),
  showOnlineOnly: z.boolean().optional(),
  hideInactiveUsers: z.boolean().optional(),
  preferredLanguages: z.array(z.string().min(1).max(10)).max(10).optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

/** Refine: minimumAge must not exceed maximumAge. */
export const updatePreferencesSchemaRefined = updatePreferencesSchema.refine(
  (v) => v.minimumAge == null || v.maximumAge == null || v.minimumAge <= v.maximumAge,
  { message: 'minimumAge must be <= maximumAge', path: ['minimumAge'] },
);
