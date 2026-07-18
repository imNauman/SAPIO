import { z } from 'zod';

/**
 * Match domain types + validation.
 *
 * Why: A match is the result of a mutual LIKE between two users. We store the
 * pair in a deterministic order (smaller UUID = user_one_id) so that (A,B) and
 * (B,A) collapse to the same row — enforced by the unique index
 * `matches_unique_pair_idx`. These types are the contract between the
 * controller, service, and repository. The swipe flow calls into the match
 * service to detect a reciprocal like and create the match.
 */

/** A persisted match record (server shape). */
export interface MatchRecord {
  id: string;
  userOneId: string;
  userTwoId: string;
  createdAt: string;
  matchedAt: string;
  isActive: boolean;
}

/** A match enriched with the "other" participant's profile (for the UI). */
export interface MatchWithProfile {
  id: string;
  /** The other participant (not the requesting user). */
  matchedUserId: string;
  matchedUser: MatchUserProfile;
  createdAt: string;
  matchedAt: string;
  isActive: boolean;
}

/** Minimal profile info for the matched user, as shown in the match list. */
export interface MatchUserProfile {
  userId: string;
  displayName: string | null;
  username: string | null;
  primaryPhotoUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
}

/** Body for PATCH /matches/archive (bulk archive by ids). */
export const archiveMatchesSchema = z.object({
  ids: z
    .array(z.string().uuid('Each id must be a valid UUID'))
    .min(1, 'At least one match id is required'),
});

export type ArchiveMatchesBody = z.infer<typeof archiveMatchesSchema>;
