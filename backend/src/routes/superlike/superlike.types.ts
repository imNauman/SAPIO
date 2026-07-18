import { z } from 'zod';

/**
 * Super Like domain types + validation.
 *
 * Why: A Super Like is a premium swipe that reuses the swipe engine (a
 * `SUPER_LIKE` action on `swipes`) and additionally records a `super_likes`
 * event so the recipient is notified and the recommendation engine can
 * prioritize the sender. Only eligible subscription tiers may Super Like
 * (enforced via `requireFeature('super_like')`), and a daily limit is enforced
 * via the feature-usage module (resolved from subscription features). Duplicate
 * Super Likes on the same target are prevented by a unique DB constraint.
 */
export const createSuperLikeSchema = z.object({
  toUserId: z.string().uuid('toUserId must be a valid UUID'),
});
export type CreateSuperLikeBody = z.infer<typeof createSuperLikeSchema>;

/** A super like record (server shape). */
export interface SuperLikeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

/** A super like received by the caller (for the "who liked you" surface). */
export interface SuperLikeReceived {
  id: string;
  fromUserId: string;
  createdAt: string;
}
