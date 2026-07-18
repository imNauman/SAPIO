import { apiClient } from '../apiClient';

/**
 * Block API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/block` endpoints. The mobile app
 * sends the Supabase JWT via the `apiClient` interceptor. These functions are
 * the only place that knows about block HTTP details — the block store calls
 * these, keeping the UI decoupled from transport. Blocking is immediate and
 * affects every surface (recommendations, discovery, profile, chat, matches)
 * through the shared backend helper. Reporting is a separate (future) feature
 * and is intentionally NOT modeled here.
 */

/** Allowed block reasons (mirrors the backend `BLOCK_REASONS`). */
export const BLOCK_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'fake_profile',
  'not_interested',
  'other',
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];

/** A blocked user enriched with the minimal profile for the UI list. */
export interface BlockedUser {
  id: string;
  blockedUserId: string;
  reason: string | null;
  createdAt: string;
  displayName: string | null;
  username: string | null;
  primaryPhotoUrl: string | null;
}

/** Body for POST /block. */
export interface CreateBlockInput {
  userId: string;
  reason?: string;
}

export const blockApi = {
  /** Block a user. Idempotent — a duplicate returns the existing record. */
  async block(userId: string, reason?: string): Promise<BlockedUser> {
    const { data } = await apiClient.post<{ data: { block: BlockedUser } }>(
      '/block',
      { userId, reason },
    );
    return data.data.block;
  },

  /** Unblock a user by their id. */
  async unblock(userId: string): Promise<void> {
    await apiClient.delete(`/block/${userId}`);
  },

  /** List the caller's blocked users. */
  async list(): Promise<BlockedUser[]> {
    const { data } = await apiClient.get<{ data: { blockedUsers: BlockedUser[] } }>(
      '/block/list',
    );
    return data.data.blockedUsers;
  },
};
