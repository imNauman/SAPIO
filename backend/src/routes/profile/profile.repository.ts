import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../utils/errors';
import { Profile, ProfileInput, LocationInput } from './profile.types';

/**
 * Profile repository.
 *
 * Why: Isolates all raw Supabase table queries behind a typed interface so the
 * service layer never writes SQL/query-builder code. Uses the admin client so
 * server-side operations (e.g. creating a profile for a verified user) are not
 * blocked by RLS, while RLS still protects direct client access.
 *
 * Column mapping: the DB uses snake_case; the app uses camelCase. We map at the
 * boundary in `mapRow`.
 */
const TABLE = 'profiles';

interface ProfileRow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  birth_date: string | null;
  gender: Profile['gender'];
  interested_in: string[];
  relationship_goal: Profile['relationshipGoal'];
  height_cm: number | null;
  occupation: string | null;
  education: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_completed: boolean;
  is_verified: boolean;
  is_premium: boolean;
  last_active: string | null;
  location_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function mapRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    birthDate: row.birth_date,
    gender: row.gender,
    interestedIn: (row.interested_in as Profile['interestedIn']) ?? [],
    relationshipGoal: row.relationship_goal,
    heightCm: row.height_cm,
    occupation: row.occupation,
    education: row.education,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    profileCompleted: row.profile_completed,
    isVerified: row.is_verified,
    isPremium: row.is_premium,
    lastActive: row.last_active,
    locationUpdatedAt: row.location_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: ProfileInput): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.username !== undefined) row.username = input.username;
  if (input.displayName !== undefined) row.display_name = input.displayName;
  if (input.bio !== undefined) row.bio = input.bio;
  if (input.birthDate !== undefined) row.birth_date = input.birthDate;
  if (input.gender !== undefined) row.gender = input.gender;
  if (input.interestedIn !== undefined) row.interested_in = input.interestedIn;
  if (input.relationshipGoal !== undefined)
    row.relationship_goal = input.relationshipGoal;
  if (input.heightCm !== undefined) row.height_cm = input.heightCm;
  if (input.occupation !== undefined) row.occupation = input.occupation;
  if (input.education !== undefined) row.education = input.education;
  if (input.city !== undefined) row.city = input.city;
  if (input.country !== undefined) row.country = input.country;
  return row;
}

export const profileRepository = {
  async findByUserId(
    client: SupabaseClient,
    userId: string,
  ): Promise<Profile | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new AppError(500, error.message);
    }
    return data ? mapRow(data as ProfileRow) : null;
  },

  async findById(
    client: SupabaseClient,
    id: string,
  ): Promise<Profile | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new AppError(500, error.message);
    }
    return data ? mapRow(data as ProfileRow) : null;
  },

  async findByUsername(
    client: SupabaseClient,
    username: string,
  ): Promise<Profile | null> {
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error) {
      throw new AppError(500, error.message);
    }
    return data ? mapRow(data as ProfileRow) : null;
  },

  async create(
    client: SupabaseClient,
    userId: string,
    input: ProfileInput,
  ): Promise<Profile> {
    const row = { ...toRow(input), user_id: userId };
    const { data, error } = await client
      .from(TABLE)
      .insert(row)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        // unique_violation — username or user_id already taken
        throw new AppError(
          409,
          error.message.includes('username')
            ? 'That username is already taken'
            : 'A profile already exists for this user',
        );
      }
      throw new AppError(500, error.message);
    }
    return mapRow(data as ProfileRow);
  },

  async update(
    client: SupabaseClient,
    userId: string,
    input: ProfileInput,
  ): Promise<Profile> {
    const row = toRow(input);
    const { data, error } = await client
      .from(TABLE)
      .update(row)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new AppError(409, 'That username is already taken');
      }
      throw new AppError(500, error.message);
    }
    if (!data) {
      throw new AppError(404, 'Profile not found');
    }
    return mapRow(data as ProfileRow);
  },

  async updateLocation(
    client: SupabaseClient,
    userId: string,
    input: LocationInput,
  ): Promise<Profile> {
    const { data, error } = await client
      .from(TABLE)
      .update({
        latitude: input.latitude,
        longitude: input.longitude,
        city: input.city,
        country: input.country,
        // Stamp the write so the Location API / geo queries know freshness.
        location_updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) {
      throw new AppError(500, error.message);
    }
    if (!data) {
      throw new AppError(404, 'Profile not found');
    }
    return mapRow(data as ProfileRow);
  },

  async touchActivity(
    client: SupabaseClient,
    userId: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) {
      throw new AppError(500, error.message);
    }
  },

  /** Set the verification flag (used by the verification service on approval). */
  async setVerified(
    client: SupabaseClient,
    userId: string,
    isVerified: boolean,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ is_verified: isVerified })
      .eq('user_id', userId);
    if (error) {
      throw new AppError(500, error.message);
    }
  },
};

// Default export uses the admin client for trusted server-side access.
export const profileRepo = {
  findByUserId: (userId: string) =>
    profileRepository.findByUserId(supabaseAdmin, userId),
  findById: (id: string) => profileRepository.findById(supabaseAdmin, id),
  findByUsername: (username: string) =>
    profileRepository.findByUsername(supabaseAdmin, username),
  create: (userId: string, input: ProfileInput) =>
    profileRepository.create(supabaseAdmin, userId, input),
  update: (userId: string, input: ProfileInput) =>
    profileRepository.update(supabaseAdmin, userId, input),
  updateLocation: (userId: string, input: LocationInput) =>
    profileRepository.updateLocation(supabaseAdmin, userId, input),
  touchActivity: (userId: string) =>
    profileRepository.touchActivity(supabaseAdmin, userId),
  setVerified: (userId: string, isVerified: boolean) =>
    profileRepository.setVerified(supabaseAdmin, userId, isVerified),
};
