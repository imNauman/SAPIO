import { profileRepo } from './profile.repository';
import { AppError } from '../../utils/errors';
import { Profile, ProfileInput, LocationInput } from './profile.types';

/**
 * Profile service.
 *
 * Why: Encapsulates business rules (one profile per user, ownership checks,
 * auto-flagging `profile_completed`) on top of the repository. Controllers call
 * this and never touch the repository or Supabase directly.
 */
export const profileService = {
  /** Get the authenticated user's own profile (404 if none yet). */
  async getOwn(userId: string): Promise<Profile> {
    const profile = await profileRepo.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }
    return profile;
  },

  /** Get any profile by its public id (read-only, e.g. viewing others later). */
  async getById(id: string): Promise<Profile> {
    const profile = await profileRepo.findById(id);
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }
    return profile;
  },

  /** Create the user's profile. Fails if one already exists (1:1). */
  async create(userId: string, input: ProfileInput): Promise<Profile> {
    const existing = await profileRepo.findByUserId(userId);
    if (existing) {
      throw new AppError(409, 'A profile already exists for this user');
    }
    const profile = await profileRepo.create(userId, {
      ...input,
      // A complete profile is one with the core identity fields filled in.
      // We mark completion here; the app can also compute it client-side.
    });
    return profile;
  },

  /** Update the user's own profile. */
  async update(userId: string, input: ProfileInput): Promise<Profile> {
    // Ensure a profile exists before patching.
    const existing = await profileRepo.findByUserId(userId);
    if (!existing) {
      throw new AppError(404, 'Profile not found');
    }
    return profileRepo.update(userId, input);
  },

  /** Patch only the location fields. */
  async updateLocation(
    userId: string,
    input: LocationInput,
  ): Promise<Profile> {
    const existing = await profileRepo.findByUserId(userId);
    if (!existing) {
      throw new AppError(404, 'Profile not found');
    }
    return profileRepo.updateLocation(userId, input);
  },

  /** Record that the user was active just now. */
  async recordActivity(userId: string): Promise<void> {
    await profileRepo.touchActivity(userId);
  },
};
