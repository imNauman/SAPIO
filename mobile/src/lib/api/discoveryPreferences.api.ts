import { apiClient } from '../apiClient';
import {
  UserPreferences,
  UpdatePreferencesInput,
} from './recommendation.api';
import { LocationInput } from './profile.api';

/**
 * Discovery Preferences API client.
 *
 * Why: Thin wrapper over the backend Discovery + Location endpoints. Preferences
 * are owned by the Recommendation Engine (served at `/api/discovery/preferences`
 * and `/api/recommendations/preferences` — same source of truth), so we reuse
 * the `UserPreferences` / `UpdatePreferencesInput` contract from
 * `recommendation.api` and never duplicate the shape. Location writes go to
 * `/api/location` (the single coordinate write path). The mobile app never
 * filters the feed — it only reads ranked results and edits these inputs.
 */
export interface LocationResult {
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
  locationUpdatedAt: string;
}

export const discoveryPreferencesApi = {
  /** GET /discovery/preferences — current discovery filters. */
  async getPreferences(): Promise<UserPreferences> {
    const { data } = await apiClient.get<{ preferences: UserPreferences }>(
      '/discovery/preferences',
    );
    return data.preferences;
  },

  /** PATCH /discovery/preferences — update discovery filters. */
  async updatePreferences(
    input: UpdatePreferencesInput,
  ): Promise<UserPreferences> {
    const { data } = await apiClient.patch<{ preferences: UserPreferences }>(
      '/discovery/preferences',
      input,
    );
    return data.preferences;
  },

  /** PATCH /location — update the caller's current coordinates. */
  async updateLocation(input: LocationInput): Promise<LocationResult> {
    const { data } = await apiClient.patch<{ location: LocationResult }>(
      '/location',
      input,
    );
    return data.location;
  },
};
