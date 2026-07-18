import { Gender } from '../profile/profile.types';

/**
 * Discovery domain types.
 *
 * Why: The discovery feed returns a flattened, client-friendly view of a
 * candidate profile plus its primary photo. We compute derived fields (age,
 * online status, distance) server-side so the mobile card stays dumb.
 */

/** A single discoverable profile card payload. */
export interface DiscoveryProfile {
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
  /** True when the user was active recently (see ACTIVE_WITHIN_DAYS). */
  isOnline: boolean;
  /**
   * Distance in km from the current user. `null` until both profiles have
   * coordinates (geo is not part of this milestone — this is a placeholder
   * that becomes real once location is populated).
   */
  distanceKm: number | null;
}

/** Query params for the paginated feed. */
export interface FeedQuery {
  /** Exclusive cursor: return candidates after this profile id. */
  cursor?: string;
  limit?: number;
}

/** A page of the feed. */
export interface FeedPage {
  profiles: DiscoveryProfile[];
  /** Cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}
