import { z } from 'zod';

/**
 * Swipe domain types + validation.
 *
 * Why: The swipe engine records a user's LIKE/PASS decision on another user.
 * This milestone persists the swipe and returns success — it does NOT create
 * matches (a future engine will detect mutual likes from these rows). Types
 * here are the contract between the controller, service, and repository.
 */

/** Allowed swipe actions. */
export const SwipeAction = {
  LIKE: 'LIKE',
  PASS: 'PASS',
  SUPER_LIKE: 'SUPER_LIKE',
} as const;

export type SwipeActionType = (typeof SwipeAction)[keyof typeof SwipeAction];

/** A persisted swipe record (server shape). */
export interface SwipeRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: SwipeActionType;
  createdAt: string;
}

/** Request body for POST /swipe. */
export interface CreateSwipeInput {
  toUserId: string;
  action: SwipeActionType;
}

/** A swipe returned in history. */
export interface SwipeHistoryItem {
  id: string;
  toUserId: string;
  action: SwipeActionType;
  createdAt: string;
}

/** Zod schema for the create-swipe request body. */
export const createSwipeSchema = z.object({
  toUserId: z.string().uuid('toUserId must be a valid UUID'),
  action: z.enum(['LIKE', 'PASS', 'SUPER_LIKE'], {
    errorMap: () => ({ message: "action must be 'LIKE', 'PASS', or 'SUPER_LIKE'" }),
  }),
});

export type CreateSwipeBody = z.infer<typeof createSwipeSchema>;
