import { create } from 'zustand';
import {
  DiscoveryProfile,
  FeedPage,
  discoveryApi,
} from '../lib/api/discovery.api';
import { swipeApi, SwipeAction, SwipeResult } from '../lib/api/swipe.api';
import { useMatchStore } from './matchStore';

/**
 * Swipe store (Zustand).
 *
 * Why: Single source of truth for the Tinder-style deck. It reuses the discovery
 * feed as the card source but models the deck explicitly: `currentCard` is the
 * top card, `remainingCards` are the ones queued behind it, and `swipeLeft` /
 * `swipeRight` both (1) optimistically advance the deck and (2) persist the
 * swipe via `swipeApi`. `recordSwipe` is the pure persistence call used by the
 * gesture layer. `undoStack` is kept for a future undo feature and is not yet
 * surfaced in the UI. HTTP lives in `discovery.api` / `swipe.api`; this store
 * is a thin state container. Matching is intentionally absent.
 */
interface SwipeState {
  /** All loaded candidate cards (the deck source). */
  deck: DiscoveryProfile[];
  /** Index of the current top card within `deck`. */
  currentIndex: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  /** Undo buffer (future use). Holds the last removed card + its swipe result. */
  undoStack: Array<{ profile: DiscoveryProfile; swipe: SwipeResult | null }>;

  /** Load the first page of the deck. */
  loadDeck: () => Promise<void>;
  /** Pull-to-refresh: replace the deck with a fresh first page. */
  refreshDeck: () => Promise<void>;
  /** Append the next page when the user nears the end. */
  loadMore: () => Promise<void>;

  /** The profile currently on top of the deck (or null when empty). */
  currentCard: () => DiscoveryProfile | null;
  /** The next profile behind the top card (for pre-scaling), or null. */
  nextCard: () => DiscoveryProfile | null;
  /** Cards still queued after the current one. */
  remainingCards: () => DiscoveryProfile[];

  /** Persist a swipe (used by the gesture layer). Returns the swipe result. */
  recordSwipe: (toUserId: string, action: SwipeAction) => Promise<SwipeResult>;

  /** Advance the deck after a LEFT (PASS) swipe. */
  swipeLeft: (profile: DiscoveryProfile) => Promise<void>;
  /** Advance the deck after a RIGHT (LIKE) swipe. */
  swipeRight: (profile: DiscoveryProfile) => Promise<void>;

  /** Clear deck state (e.g. on logout). */
  clear: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  loading: false,
  refreshing: false,
  error: null,
  nextCursor: null,
  hasMore: false,
  undoStack: [],

  loadDeck: async () => {
    set({ loading: true, error: null });
    try {
      const page: FeedPage = await discoveryApi.getFeed();
      set({
        deck: page.profiles,
        currentIndex: 0,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load deck',
      });
    }
  },

  refreshDeck: async () => {
    set({ refreshing: true, error: null });
    try {
      const page: FeedPage = await discoveryApi.refreshFeed();
      set({
        deck: page.profiles,
        currentIndex: 0,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        refreshing: false,
      });
    } catch (e) {
      set({
        refreshing: false,
        error: e instanceof Error ? e.message : 'Failed to refresh deck',
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
        deck: [...state.deck, ...page.profiles],
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

  currentCard: () => {
    const { deck, currentIndex } = get();
    return deck[currentIndex] ?? null;
  },

  nextCard: () => {
    const { deck, currentIndex } = get();
    return deck[currentIndex + 1] ?? null;
  },

  remainingCards: () => {
    const { deck, currentIndex } = get();
    return deck.slice(currentIndex + 1);
  },

  recordSwipe: async (toUserId, action) => {
    return swipeApi.create({ toUserId, action });
  },

  swipeLeft: async (profile) => {
    // Optimistic deck advance, then persist.
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      undoStack: [
        ...state.undoStack,
        { profile, swipe: null },
      ].slice(-20),
    }));
    try {
      const swipe = await swipeApi.create({ toUserId: profile.userId, action: 'PASS' });
      // Attach the saved record to the undo entry.
      set((state) => {
        const stack = [...state.undoStack];
        const last = stack[stack.length - 1];
        if (last && last.profile.id === profile.id) {
          stack[stack.length - 1] = { profile, swipe };
        }
        return { undoStack: stack };
      });
    } catch (e) {
      // Roll back the advance on failure so the card stays.
      set((state) => ({
        currentIndex: Math.max(0, state.currentIndex - 1),
        error: e instanceof Error ? e.message : 'Failed to pass',
      }));
      throw e;
    }
  },

  swipeRight: async (profile) => {
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      undoStack: [
        ...state.undoStack,
        { profile, swipe: null },
      ].slice(-20),
    }));
    try {
      const result = await swipeApi.create({ toUserId: profile.userId, action: 'LIKE' });
      set((state) => {
        const stack = [...state.undoStack];
        const last = stack[stack.length - 1];
        if (last && last.profile.id === profile.id) {
          stack[stack.length - 1] = { profile, swipe: result };
        }
        return { undoStack: stack };
      });
      // If this LIKE produced a mutual match, surface the "It's a Match!" modal.
      if (result.matched && result.matchId && result.matchedUser) {
        useMatchStore.getState().setNewMatch({
          matchId: result.matchId,
          matchedUser: result.matchedUser,
        });
      }
    } catch (e) {
      set((state) => ({
        currentIndex: Math.max(0, state.currentIndex - 1),
        error: e instanceof Error ? e.message : 'Failed to like',
      }));
      throw e;
    }
  },

  clear: () => {
    set({
      deck: [],
      currentIndex: 0,
      loading: false,
      refreshing: false,
      error: null,
      nextCursor: null,
      hasMore: false,
      undoStack: [],
    });
  },
}));
