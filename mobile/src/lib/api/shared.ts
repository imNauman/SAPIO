/**
 * Shared mobile API types.
 *
 * Why: Several API modules previously re-declared the same enums/interfaces
 * (Gender, RelationshipGoal, the matched-user profile shape). Centralizing them
 * here gives one source of truth so a contract change is made in exactly one
 * place. Other api modules re-export from here for backward compatibility.
 */

export type Gender = 'male' | 'female' | 'non_binary' | 'other';

export type RelationshipGoal =
  | 'casual'
  | 'dating'
  | 'serious'
  | 'friendship'
  | 'marriage';

export type InterestedIn = Gender;

/** The matched counterpart's profile, returned by match/swipe flows. */
export interface MatchedUserProfile {
  userId: string;
  displayName: string | null;
  username: string | null;
  primaryPhotoUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
}
