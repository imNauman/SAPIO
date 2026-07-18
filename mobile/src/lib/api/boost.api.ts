import { apiClient } from '../apiClient';

/** A boost session returned by the backend. */
export interface BoostSession {
  id: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  boostMultiplier: number;
  status: 'active' | 'expired' | 'canceled';
  createdAt: string;
}

/**
 * Boost API client.
 *
 * Why: Thin wrapper around `apiClient` for the Boost endpoints. Types mirror the
 * backend contract. The `boost` feature gate is enforced server-side; the client
 * only renders the UI when the caller's subscription features allow it.
 */
export const boostApi = {
  /** POST /boost/start — start a boost (requires the `boost` feature). */
  async start(): Promise<BoostSession> {
    const res = await apiClient.post<{ data: { boost: BoostSession } }>(
      '/boost/start',
      {},
    );
    return res.data.data.boost;
  },

  /** GET /boost/status — the caller's active boost, if any. */
  async getStatus(): Promise<BoostSession | null> {
    const res = await apiClient.get<{ data: { boost: BoostSession | null } }>(
      '/boost/status',
    );
    return res.data.data.boost;
  },
};
