import { z } from 'zod';

/**
 * Location module types + validation.
 *
 * Why: The Location API is the single write path for a user's coordinates. The
 * Recommendation Engine reads `profiles.latitude/longitude` (via the profile
 * repository) to compute distances; this module only validates and persists.
 * Coordinates are validated by `GeoService.validateCoordinates` before they
 * reach the repository, so the schema here is a thin Zod guard.
 */
export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/** The shape returned to the client after a successful location update. */
export interface LocationResult {
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
  locationUpdatedAt: string;
}
