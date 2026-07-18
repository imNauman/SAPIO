import { apiClient } from '../apiClient';
import { MatchedUserProfile } from './shared';

/**
 * Match API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/matches` endpoints. The mobile
 * app sends the Supabase JWT via the `apiClient` interceptor. These functions
 * are the only place that knows about match HTTP details — the match store
 * calls these, keeping the UI decoupled from transport. Match creation itself
 * happens as a side effect of a LIKE in the swipe flow; this module only reads
 * and manages existing matches. Chat is a separate future milestone.
 */

export type { MatchedUserProfile };

export interface Match {
  id: string;
  matchedUserId: string;
  matchedUser: MatchedUserProfile;
  createdAt: string;
  matchedAt: string;
  isActive: boolean;
}

export const matchApi = {
  /** Fetch the caller's matches. */
  async list(): Promise<Match[]> {
    const { data } = await apiClient.get<{ data: { matches: Match[] } }>(
      '/matches',
    );
    return data.data.matches;
  },

  /** Fetch a single match by id. */
  async get(id: string): Promise<Match> {
    const { data } = await apiClient.get<{ data: { match: Match } }>(
      `/matches/${id}`,
    );
    return data.data.match;
  },

  /** Delete a match by id. */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/matches/${id}`);
  },

  /** Bulk-archive matches by ids. */
  async archive(ids: string[]): Promise<number> {
    const { data } = await apiClient.patch<{ data: { archived: number } }>(
      '/matches/archive',
      { ids },
    );
    return data.data.archived;
  },
};
