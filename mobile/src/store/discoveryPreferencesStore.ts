import { create } from 'zustand';
import * as Location from 'expo-location';
import {
  discoveryPreferencesApi,
  LocationResult,
} from '../lib/api/discoveryPreferences.api';
import {
  UserPreferences,
  UpdatePreferencesInput,
} from '../lib/api/recommendation.api';

/**
 * Discovery Preferences store (Zustand).
 *
 * Why: Single source of truth for the caller's discovery filters + location on
 * the mobile side. It caches `UserPreferences` (owned by the backend
 * Recommendation Engine) and exposes load/save/updateLocation actions. Saving
 * preferences or moving invalidates the engine's cached feed server-side, so
 * the deck should be refreshed by the caller afterwards.
 *
 * `requestLocationPermission` wraps `expo-location` so screens never touch the
 * native API directly and can handle denied / unavailable / GPS-disabled states
 * with a graceful fallback to the last known location.
 */
export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'unavailable'; // GPS disabled / service unavailable

interface DiscoveryPreferencesState {
  preferences: UserPreferences | null;
  location: LocationResult | null;
  permissionStatus: LocationPermissionStatus | null;
  loading: boolean;
  saving: boolean;
  locating: boolean;
  error: string | null;

  /** Load current preferences (defaults applied server-side). */
  loadPreferences: () => Promise<void>;
  /** Persist preference changes. */
  updatePreferences: (input: UpdatePreferencesInput) => Promise<void>;
  /** Push the device's current coordinates to the backend. */
  updateLocation: (coords: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  }) => Promise<void>;
  /**
   * Request foreground location permission, then read the device location.
   * Returns the resolved status; on success also pushes coords to the backend.
   * Falls back to the last known location when GPS is disabled/unavailable.
   */
  requestLocationPermission: () => Promise<LocationPermissionStatus>;
  /** Clear state (e.g. on logout). */
  clear: () => void;
}

export const useDiscoveryPreferencesStore = create<DiscoveryPreferencesState>(
  (set, get) => ({
    preferences: null,
    location: null,
    permissionStatus: null,
    loading: false,
    saving: false,
    locating: false,
    error: null,

    loadPreferences: async () => {
      set({ loading: true, error: null });
      try {
        const preferences = await discoveryPreferencesApi.getPreferences();
        set({ preferences, loading: false });
      } catch (e) {
        set({
          loading: false,
          error:
            e instanceof Error ? e.message : 'Failed to load preferences',
        });
      }
    },

    updatePreferences: async (input) => {
      set({ saving: true, error: null });
      try {
        const preferences = await discoveryPreferencesApi.updatePreferences(input);
        set({ preferences, saving: false });
      } catch (e) {
        set({
          saving: false,
          error:
            e instanceof Error ? e.message : 'Failed to save preferences',
        });
        throw e;
      }
    },

    updateLocation: async (coords) => {
      set({ locating: true, error: null });
      try {
        const location = await discoveryPreferencesApi.updateLocation(coords);
        set({ location, locating: false });
      } catch (e) {
        set({
          locating: false,
          error: e instanceof Error ? e.message : 'Failed to update location',
        });
        throw e;
      }
    },

    requestLocationPermission: async () => {
      set({ locating: true, error: null });
      try {
        // 1) Check / request foreground permission.
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          set({ permissionStatus: 'denied', locating: false });
          return 'denied';
        }

        // 2) Read the current position. If the OS reports the provider as
        //    unavailable (GPS off / no network), fall back to last known.
        let position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (!position) {
          const last = await Location.getLastKnownPositionAsync().catch(
            () => null,
          );
          if (last) {
            position = last;
            set({ permissionStatus: 'unavailable', locating: false });
            // Still push the last known location so discovery keeps working.
            await get().updateLocation({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
            });
            return 'unavailable';
          }
          set({ permissionStatus: 'unavailable', locating: false });
          return 'unavailable';
        }

        set({ permissionStatus: 'granted', locating: false });
        await get().updateLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        return 'granted';
      } catch (e) {
        set({
          locating: false,
          permissionStatus: 'unavailable',
          error: e instanceof Error ? e.message : 'Location unavailable',
        });
        return 'unavailable';
      }
    },

    clear: () =>
      set({
        preferences: null,
        location: null,
        permissionStatus: null,
        loading: false,
        saving: false,
        locating: false,
        error: null,
      }),
  }),
);
