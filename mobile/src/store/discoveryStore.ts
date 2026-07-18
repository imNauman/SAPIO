import { create } from 'zustand';
import {
  DiscoveryProfile,
  FeedPage,
  discoveryApi,
} from '../lib/api/discovery.api';

/**
 * Discovery store (Zustand).
 *
 * Why: Single source of truth for the discovery feed. Screens read `feed`,
 * `loading`, `refreshing`, `error`, `nextCursor`, `hasMore` and call
 * `refreshFeed` / `loadMore` / `removeCard` / `fetchProfile`. HTTP lives in
 * `discovery.api`, keeping the store a thin state container. Pagination is
 * keyset-based: `nextCursor` from the server is sent back to fetch the next page.
 */
interface DiscoveryState {
  feed: DiscoveryProfile[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;

  /** Pull-to-refresh: replace the feed with a fresh first page. */
  refreshFeed: () => Promise<void>;
  /** Infinite scroll: append the next page. */
  loadMore: () => Promise<void>;
  /** Remove a card from the feed (e.g. after a future pass action). */
  removeCard: (id: string) => void;
  /** Fetch a single candidate profile by id. */
  fetchProfile: (id: string) => Promise<DiscoveryProfile>;
  /** Clear feed state (e.g. on logout). */
  clear: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  feed: [],
  loading: false,
  refreshing: false,
  error: null,
  nextCursor: null,
  hasMore: false,

  refreshFeed: async () => {
    set({ refreshing: true, error: null });
    try {
      const page: FeedPage = await discoveryApi.refreshFeed();
      set({
        feed: page.profiles,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        refreshing: false,
      });
    } catch (e) {
      set({
        refreshing: false,
        error: e instanceof Error ? e.message : 'Failed to refresh feed',
      });
    }
  },

  loadMore: async () => {
    const { nextCursor, hasMore, loading } = get();
    if (loading || !hasMore || !nextCursor) return;
    set({ loading: true, error: null });
    try {
      const page: FeedPage = await discoveryApi.getFeed(nextCursor);
      set((state) => ({
        feed: [...state.feed, ...page.profiles],
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        loading: false,
      }));
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load more',
      });
    }
  },

  removeCard: (id) => {
    set((state) => ({ feed: state.feed.filter((p) => p.id !== id) }));
  },

  fetchProfile: async (id) => {
    return discoveryApi.getProfile(id);
  },

  clear: () => {
    set({
      feed: [],
      loading: false,
      refreshing: false,
      error: null,
      nextCursor: null,
      hasMore: false,
    });
  },
}));
