import { create } from 'zustand';
import { matchApi, Match } from '../lib/api/match.api';
import type { MatchedUserProfile as MatchedUser } from '../lib/api/shared';

/**
 * Match store (Zustand).
 *
 * Why: Single source of truth for the user's matches and the transient
 * "It's a Match!" modal state. `matches` is the list shown on `MatchesScreen`.
 * `newMatch` holds the most recent match so the UI can pop the celebratory
 * modal; `clearNewMatch` dismisses it. `fetchMatches` loads the list; `archive`
 * removes a match from the active list. All HTTP lives in `match.api`; this
 * store is a thin state container. The actual match creation happens in the
 * swipe flow (swipeStore), which sets `newMatch` when a LIKE produces a match.
 */
interface NewMatch {
  matchId: string;
  matchedUser: MatchedUser;
}

interface MatchState {
  matches: Match[];
  loading: boolean;
  error: string | null;
  /** The most recent match, shown in the "It's a Match!" modal (or null). */
  newMatch: NewMatch | null;

  /** Load the caller's matches. */
  fetchMatches: () => Promise<void>;
  /** Archive (hide) a match by id and remove it from the list. */
  archiveMatch: (id: string) => Promise<void>;
  /** Set the transient new-match (called by the swipe flow on a mutual LIKE). */
  setNewMatch: (match: NewMatch) => void;
  /** Dismiss the "It's a Match!" modal. */
  clearNewMatch: () => void;
  /** Clear all match state (e.g. on logout). */
  clear: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  loading: false,
  error: null,
  newMatch: null,

  fetchMatches: async () => {
    set({ loading: true, error: null });
    try {
      const matches = await matchApi.list();
      set({ matches, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load matches',
      });
    }
  },

  archiveMatch: async (id) => {
    try {
      await matchApi.archive([id]);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to archive match' });
      return;
    }
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== id),
    }));
  },

  setNewMatch: (match) => set({ newMatch: match }),

  clearNewMatch: () => set({ newMatch: null }),

  clear: () =>
    set({ matches: [], loading: false, error: null, newMatch: null }),
}));
