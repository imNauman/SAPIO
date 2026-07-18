import { apiClient } from '../apiClient';
import { Gender } from './shared';

/**
 * Discovery API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/discovery` endpoints. The mobile
 * app sends the Supabase JWT via the `apiClient` interceptor. These functions
 * are the only place that knows about discovery HTTP details — screens call the
 * Zustand store, which in turn calls these. Swipe/match actions are intentionally
 * absent; this milestone only produces the scrollable feed.
 */

export type { Gender };

export interface DiscoveryProfile {
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
}

export interface FeedPage {
  profiles: DiscoveryProfile[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const discoveryApi = {
  /** Fetch a page of the feed. Pass `cursor` to get the next page. */
  async getFeed(cursor?: string): Promise<FeedPage> {
    const { data } = await apiClient.get<{ data: FeedPage }>('/discovery/feed', {
      params: cursor ? { cursor } : undefined,
    });
    return data.data;
  },

  /** Fetch a fresh first page (used by pull-to-refresh). */
  async refreshFeed(): Promise<FeedPage> {
    const { data } = await apiClient.get<{ data: FeedPage }>('/discovery/refresh');
    return data.data;
  },

  /** Fetch a single candidate profile by id. */
  async getProfile(id: string): Promise<DiscoveryProfile> {
    const { data } = await apiClient.get<{ data: { profile: DiscoveryProfile } }>(
      `/discovery/profile/${id}`,
    );
    return data.data.profile;
  },
};
