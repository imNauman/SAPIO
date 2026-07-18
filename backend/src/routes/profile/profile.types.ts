/**
 * Profile domain types shared across the service, repository, controller, and
 * route layers. These mirror the `public.profiles` table columns.
 */
export type Gender = 'male' | 'female' | 'non_binary' | 'other';
export type RelationshipGoal =
  | 'casual'
  | 'dating'
  | 'serious'
  | 'friendship'
  | 'marriage';

/** Allowed values for the `interested_in` array (genders a user seeks). */
export type InterestedIn = Gender;

export interface Profile {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  birthDate: string | null; // ISO date (YYYY-MM-DD)
  gender: Gender | null;
  interestedIn: InterestedIn[];
  relationshipGoal: RelationshipGoal | null;
  heightCm: number | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  profileCompleted: boolean;
  isVerified: boolean;
  isPremium: boolean;
  lastActive: string | null; // ISO timestamp
  locationUpdatedAt: string | null; // ISO timestamp of last location write
  createdAt: string | null;
  updatedAt: string | null;
}

/** Fields a user may supply when creating/updating their profile. */
export interface ProfileInput {
  username?: string;
  displayName?: string;
  bio?: string;
  birthDate?: string;
  gender?: Gender;
  interestedIn?: InterestedIn[];
  relationshipGoal?: RelationshipGoal;
  heightCm?: number;
  occupation?: string;
  education?: string;
  city?: string;
  country?: string;
}

/** Fields for the lightweight location patch. */
export interface LocationInput {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}
