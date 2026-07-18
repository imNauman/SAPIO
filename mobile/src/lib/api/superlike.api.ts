import { apiClient } from '../apiClient';

/** A super like record returned by the backend. */
export interface SuperLikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

/** A super like received by the caller. */
export interface SuperLikeReceived {
  id: string;
  fromUserId: string;
  createdAt: string;
}

/**
 * Super Like API client.
 *
 * Why: Thin wrapper around `apiClient` for the Super Like endpoints. Types
 * mirror the backend contract. The `super_like` feature gate + daily limit are
 * enforced server-side; the client surfaces the remaining count from the
 * feature-usage endpoint.
 */
export const superLikeApi = {
  /** POST /super-like — send a super like (requires the `super_like` feature). */
  async send(toUserId: string): Promise<{
    superLike: SuperLikeRecord;
    matched: boolean;
    matchId: string | null;
  }> {
    const res = await apiClient.post<{
      data: {
        superLike: SuperLikeRecord;
        matched: boolean;
        matchId: string | null;
      };
    }>('/super-like', { toUserId });
    return res.data.data;
  },

  /** GET /super-like/history — the caller's sent super likes. */
  async getHistory(): Promise<SuperLikeRecord[]> {
    const res = await apiClient.get<{ data: { history: SuperLikeRecord[] } }>(
      '/super-like/history',
    );
    return res.data.data.history;
  },

  /** GET /super-like/received — super likes the caller has received. */
  async getReceived(): Promise<SuperLikeReceived[]> {
    const res = await apiClient.get<{ data: { received: SuperLikeReceived[] } }>(
      '/super-like/received',
    );
    return res.data.data.received;
  },
};
