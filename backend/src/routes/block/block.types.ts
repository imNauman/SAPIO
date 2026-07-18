import { z } from 'zod';

/**
 * Block domain types + validation.
 *
 * Why: A block is a directed edge (blocker -> blocked) with an optional reason.
 * The unique pair index guarantees at most one block per unordered pair, so
 * "blocking is immediate and idempotent" — a second attempt returns the
 * existing row instead of erroring. These types are the contract between the
 * controller, service, and repository. Reporting is a separate (future)
 * feature and is intentionally NOT modeled here.
 */

/** Allowed block reasons (free-form text is also accepted via `reason`). */
export const BLOCK_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'fake_profile',
  'not_interested',
  'other',
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];

/** A persisted block record (server shape). */
export interface BlockRecord {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  reason: string | null;
  createdAt: string;
}

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
export const createBlockSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  reason: z.string().max(120).optional(),
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
