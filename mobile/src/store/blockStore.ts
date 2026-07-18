import { create } from 'zustand';
import { blockApi, BlockedUser } from '../lib/api/block.api';

/**
 * Block store (Zustand).
 *
 * Why: Single source of truth for the user's blocked-users list. `blockedUsers`
 * is the list shown on `BlockedUsersScreen`. `refreshBlockedUsers` loads the
 * list; `blockUser` adds a user (and returns the created record so callers can
 * refresh dependent surfaces like the swipe deck / matches / chats);
 * `unblockUser` removes a user from the list. All HTTP lives in `block.api`;
 * this store is a thin state container. Blocking is immediate on the backend
 * and affects every surface through the shared helper.
 */
interface BlockState {
  blockedUsers: BlockedUser[];
  loading: boolean;
  error: string | null;

  /** Load the caller's blocked users. */
  refreshBlockedUsers: () => Promise<void>;
  /** Block a user and append the record to the list. */
  blockUser: (userId: string, reason?: string) => Promise<BlockedUser>;
  /** Unblock a user and remove them from the list. */
  unblockUser: (userId: string) => Promise<void>;
  /** Clear all block state (e.g. on logout). */
  clear: () => void;
}

export const useBlockStore = create<BlockState>((set) => ({
  blockedUsers: [],
  loading: false,
  error: null,

  refreshBlockedUsers: async () => {
    set({ loading: true, error: null });
    try {
      const blockedUsers = await blockApi.list();
      set({ blockedUsers, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load blocked users',
      });
    }
  },

  blockUser: async (userId, reason) => {
    const block = await blockApi.block(userId, reason);
    set((state) => {
      // Avoid duplicates in the local list.
      if (state.blockedUsers.some((b) => b.blockedUserId === userId)) {
        return state;
      }
      return { blockedUsers: [block, ...state.blockedUsers] };
    });
    return block;
  },

  unblockUser: async (userId) => {
    try {
      await blockApi.unblock(userId);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to unblock user' });
      return;
    }
    set((state) => ({
      blockedUsers: state.blockedUsers.filter((b) => b.blockedUserId !== userId),
    }));
  },

  clear: () => set({ blockedUsers: [], loading: false, error: null }),
}));
