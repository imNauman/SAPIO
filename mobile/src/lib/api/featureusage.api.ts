import { apiClient } from '../apiClient';

/** A feature-usage record returned by the backend. */
export interface FeatureUsage {
  id: string;
  userId: string;
  featureKey: string;
  dailyLimit: number;
  usedToday: number;
  lastReset: string;
  remaining: number;
}

/**
 * Feature-usage API client.
 *
 * Why: Thin wrapper around `apiClient` for the feature-usage read endpoint. The
 * Super Like flow consumes usage server-side; this surface only exposes the
 * remaining count so the UI can show "X of Y left today".
 */
export const featureUsageApi = {
  /** GET /feature-usage/:featureKey — current usage + remaining count. */
  async getUsage(featureKey: string): Promise<FeatureUsage> {
    const res = await apiClient.get<{ data: { usage: FeatureUsage } }>(
      `/feature-usage/${featureKey}`,
    );
    return res.data.data.usage;
  },
};
