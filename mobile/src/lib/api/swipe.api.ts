import { apiClient } from '../apiClient';
import { MatchedUserProfile } from './shared';

/**
 * Swipe API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/swipe` endpoints. The mobile app
 * sends the Supabase JWT via the `apiClient` interceptor. These functions are
 * the only place that knows about swipe HTTP details — the swipe store calls
 * these, keeping the UI decoupled from transport. Matching is NOT part of this
 * milestone; the swipe record is returned so the store can update local state.
 */
export type SwipeAction = 'LIKE' | 'PASS';

export interface SwipeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: SwipeAction;
  createdAt: string;
}

export interface SwipeHistoryItem {
  id: string;
  toUserId: string;
  action: SwipeAction;
  createdAt: string;
}

export interface CreateSwipeInput {
  toUserId: string;
  action: SwipeAction;
}

/** Result of a swipe: the saved record plus optional match info. */
export interface SwipeResult {
  swipe: SwipeRecord;
  matched: boolean;
  matchId: string | null;
  matchedUser: MatchedUserProfile | null;
}

export const swipeApi = {
  /** Record a LIKE or PASS for a target user. */
  async create(input: CreateSwipeInput): Promise<SwipeResult> {
    const { data } = await apiClient.post<{ data: SwipeResult }>(
      '/swipe',
      input,
    );
    return data.data;
  },

  /** Fetch the caller's swipe history. */
  async getHistory(): Promise<SwipeHistoryItem[]> {
    const { data } = await apiClient.get<{ data: { history: SwipeHistoryItem[] } }>(
      '/swipe/history',
    );
    return data.data.history;
  },

  /** Undo a swipe by id. */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/swipe/${id}`);
  },
};
