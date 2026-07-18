import { apiClient } from '../apiClient';
import {
  Gender,
  RelationshipGoal,
  InterestedIn,
} from './shared';

/**
 * Profile API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/profile` endpoints. The mobile
 * app sends the Supabase JWT via the `apiClient` interceptor, and the backend
 * resolves the authenticated user from it. These functions are the only place
 * that knows about profile HTTP details — screens call the Zustand store, which
 * in turn calls these.
 */

export type { Gender, RelationshipGoal, InterestedIn };

export interface Profile {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  birthDate: string | null;
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
  lastActive: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

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

export interface LocationInput {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export const profileApi = {
  async getMe(): Promise<Profile> {
    const { data } = await apiClient.get<{ data: { profile: Profile } }>(
      '/profile/me',
    );
    return data.data.profile;
  },

  async getById(id: string): Promise<Profile> {
    const { data } = await apiClient.get<{ data: { profile: Profile } }>(
      `/profile/${id}`,
    );
    return data.data.profile;
  },

  async create(input: ProfileInput): Promise<Profile> {
    const { data } = await apiClient.put<{ data: { profile: Profile } }>(
      '/profile/me',
      input,
    );
    return data.data.profile;
  },

  async update(input: ProfileInput): Promise<Profile> {
    const { data } = await apiClient.patch<{ data: { profile: Profile } }>(
      '/profile/me',
      input,
    );
    return data.data.profile;
  },

  async updateLocation(input: LocationInput): Promise<Profile> {
    const { data } = await apiClient.patch<{ data: { profile: Profile } }>(
      '/profile/location',
      input,
    );
    return data.data.profile;
  },

  async recordActivity(): Promise<void> {
    await apiClient.patch('/profile/activity');
  },
};
