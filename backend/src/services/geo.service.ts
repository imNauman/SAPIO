/**
 * GeoService — reusable geospatial helpers.
 *
 * Why: Distance math and coordinate validation were duplicated in the
 * recommendation engine (service + strategy). This service centralizes them so
 * any module (location, discovery, recommendation, future Passport/Travel Mode)
 * shares one implementation. No PostGIS dependency — pure Haversine on the app
 * tier, which is sufficient at SAPIO's scale and keeps the schema portable.
 *
 * Future optimization seam: `filterByRadius` is the single place a geospatial
 * index (PostGIS `earthdistance`, `ST_DWithin`, or a bounding-box pre-filter)
 * would slot in without changing callers.
 */

/** Earth's mean radius in kilometers. */
export const EARTH_RADIUS_KM = 6371;

/** A geographic point. */
export interface GeoPoint {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Validate a latitude/longitude pair.
 *
 * Why: The Location API must reject garbage coordinates before they reach the
 * DB. Returns true only for finite numbers inside the valid WGS84 ranges.
 */
export function validateCoordinates(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Haversine great-circle distance in kilometers.
 *
 * Why: The only distance function in the codebase. Returns null when either
 * point is missing/invalid (callers treat null as "unknown distance").
 */
export function haversineDistance(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null,
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  if (!validateCoordinates(lat1, lon1) || !validateCoordinates(lat2, lon2)) {
    return null;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** True when `point` is within `radiusKm` of `center` (null distance = false). */
export function isWithinRadius(
  center: GeoPoint,
  point: GeoPoint,
  radiusKm: number,
): boolean {
  const d = haversineDistance(
    center.latitude,
    center.longitude,
    point.latitude,
    point.longitude,
  );
  return d != null && d <= radiusKm;
}

/**
 * Filter a list of items by radius from `center`.
 *
 * Why: In-memory radius filter used by the engine's distance scoring and any
 * future geo feature. Generic over `T` so it works for candidates, profiles,
 * etc. This is the seam where a DB-side spatial query would later replace the
 * loop.
 */
export function filterByRadius<T>(
  center: GeoPoint,
  radiusKm: number,
  items: T[],
  getPoint: (item: T) => GeoPoint,
): T[] {
  if (center.latitude == null || center.longitude == null) return items;
  return items.filter((item) =>
    isWithinRadius(center, getPoint(item), radiusKm),
  );
}

export const geoService = {
  validateCoordinates,
  haversineDistance,
  isWithinRadius,
  filterByRadius,
};
