import { apiClient } from '../apiClient';
import { Gender, RelationshipGoal } from './shared';

/**
 * Recommendation API client.
 *
 * Why: The mobile app NEVER decides which profiles appear or in what order —
 * it only consumes the ranked `profiles` array returned by the backend
 * Recommendation Engine. These endpoints are the single source of truth for the
 * Discovery deck and the user's discovery preferences.
 */

export type { Gender, RelationshipGoal };

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

export interface RecommendedProfile {
  id: string;
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
  score: RecommendationScore;
}

export interface RecommendationPage {
  profiles: RecommendedProfile[];
  nextCursor: string | null;
  hasMore: boolean;
}

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

export interface UpdatePreferencesInput {
  minimumAge?: number;
  maximumAge?: number;
  maximumDistanceKm?: number;
  interestedIn?: Gender[];
  relationshipGoal?: RelationshipGoal | null;
  showVerifiedOnly?: boolean;
  showOnlineOnly?: boolean;
  hideInactiveUsers?: boolean;
  preferredLanguages?: string[];
}

export const recommendationApi = {
  /** GET /recommendations — ranked, paginated feed. */
  async getRecommendations(cursor?: string): Promise<RecommendationPage> {
    const { data } = await apiClient.get<RecommendationPage>(
      '/recommendations',
      { params: cursor ? { cursor } : undefined },
    );
    return data;
  },

  /** GET /recommendations/refresh — fresh first page. */
  async refresh(): Promise<RecommendationPage> {
    const { data } = await apiClient.get<RecommendationPage>(
      '/recommendations/refresh',
    );
    return data;
  },

  /** GET /recommendations/preferences — current preferences. */
  async getPreferences(): Promise<UserPreferences> {
    const { data } = await apiClient.get<{ preferences: UserPreferences }>(
      '/recommendations/preferences',
    );
    return data.preferences;
  },

  /** PUT /recommendations/preferences — upsert preferences. */
  async updatePreferences(
    input: UpdatePreferencesInput,
  ): Promise<UserPreferences> {
    const { data } = await apiClient.put<{ preferences: UserPreferences }>(
      '/recommendations/preferences',
      input,
    );
    return data.preferences;
  },
};
