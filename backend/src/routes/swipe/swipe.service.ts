import { supabaseAdmin } from '../../config/supabase';
import { badRequest } from '../../utils/errors';
import { swipeRepository } from './swipe.repository';
import { matchService } from '../match/match.service';
import { blockService } from '../block/block.service';
import { profileRepo } from '../profile/profile.repository';
import {
  CreateSwipeInput,
  SwipeHistoryItem,
  SwipeRecord,
} from './swipe.types';
import { MatchUserProfile } from '../match/match.types';

/**
 * Swipe service.
 *
 * Why: Orchestrates the swipe business rules. Validates the target is not the
 * caller, delegates persistence to the repository (which enforces the
 * one-swipe-per-pair rule and target existence), and returns the saved record.
 * On a successful LIKE it triggers the match engine to detect a reciprocal like
 * and create a match if one exists. PASS actions never create matches.
 */
export const swipeService = {
  /** Record a swipe for the authenticated user. */
  async recordSwipe(
    fromUserId: string,
    input: CreateSwipeInput,
  ): Promise<{
    swipe: SwipeRecord;
    matched: boolean;
    matchId: string | null;
    matchedUser: MatchUserProfile | null;
  }> {
    if (input.toUserId === fromUserId) {
      throw badRequest('You cannot swipe yourself');
    }
    // A blocked user (in either direction) cannot be swiped/matched.
    await blockService.requireNotBlocked(fromUserId, input.toUserId);
    // Swiping counts as activity (drives the "hide inactive" filter).
    await profileRepo.touchActivity(fromUserId).catch(() => {});
    const swipe = await swipeRepository.createSwipe(
      supabaseAdmin,
      fromUserId,
      input.toUserId,
      input.action,
    );

    // A LIKE or SUPER_LIKE can produce a match. PASS is ignored by the engine.
    let matched = false;
    let matchId: string | null = null;
    let matchedUser: MatchUserProfile | null = null;
    if (input.action === 'LIKE' || input.action === 'SUPER_LIKE') {
      const result = await matchService.processLike(fromUserId, input.toUserId);
      matched = result.matched;
      matchId = result.matchId;
      matchedUser = result.matchedUser;
    }

    return { swipe, matched, matchId, matchedUser };
  },

  /** Return the caller's swipe history. */
  async getHistory(fromUserId: string): Promise<SwipeHistoryItem[]> {
    return swipeRepository.getHistory(supabaseAdmin, fromUserId);
  },

  /** Delete (undo) a swipe owned by the caller. */
  async deleteSwipe(fromUserId: string, id: string): Promise<void> {
    return swipeRepository.deleteSwipe(supabaseAdmin, id, fromUserId);
  },
};
