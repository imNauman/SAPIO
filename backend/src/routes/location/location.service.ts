import { profileRepo } from '../profile/profile.repository';
import { validateCoordinates } from '../../services/geo.service';
import { badRequest } from '../../utils/errors';
import { UpdateLocationInput, LocationResult } from './location.types';

/**
 * Location service.
 *
 * Why: The ONLY place that writes a user's coordinates. It validates via
 * `GeoService.validateCoordinates` (single source of truth for coordinate
 * rules), then delegates persistence to the profile repository, which stamps
 * `location_updated_at`. The Recommendation Engine reads these coordinates
 * later — this module never ranks or filters. Overwrites the previous location
 * on every call (last-write-wins), which is the desired behavior for live GPS.
 */
export const locationService = {
  /**
   * Persist the caller's current location.
   *
   * @throws badRequest when coordinates are missing or out of range.
   */
  async updateLocation(
    userId: string,
    input: UpdateLocationInput,
  ): Promise<LocationResult> {
    if (!validateCoordinates(input.latitude, input.longitude)) {
      throw badRequest('Invalid coordinates');
    }

    const profile = await profileRepo.updateLocation(userId, {
      latitude: input.latitude,
      longitude: input.longitude,
      country: input.country,
      city: input.city,
    });

    return {
      latitude: profile.latitude as number,
      longitude: profile.longitude as number,
      country: profile.country,
      city: profile.city,
      // The repository stamps location_updated_at; surface it back to the client.
      locationUpdatedAt: (profile as unknown as { locationUpdatedAt?: string })
        .locationUpdatedAt ?? new Date().toISOString(),
    };
  },
};
