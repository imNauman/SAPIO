import { supabaseAdmin } from '../../config/supabase';
import { badRequest, forbidden } from '../../utils/errors';
import { matchRepository } from '../match/match.repository';
import { conversationRepository } from '../chat/conversation.repository';
import { blockRepository } from './block.repository';
import { BlockRecord, BlockedUser, CreateBlockInput } from './block.types';

/**
 * Block service.
 *
 * Why: Encapsulates the blocking business rules. Blocking is IMMEDIATE and
 * affects every surface through the shared `blockRepository.isBlockedEitherWay`
 * helper (no duplicated logic):
 *  - removed from recommendations (engine excludes both directions)
 *  - removed from discovery (same exclusion set)
 *  - profile hidden (profile viewing is gated)
 *  - chat hidden (conversations with a blocked counterpart are filtered)
 *  - messaging prevented (active-match gate + block check)
 *  - future matching prevented (swipe LIKE is rejected)
 *
 * On block we also ARCHIVE any existing match/conversation between the pair so
 * the chat disappears at once. Unblocking only restores *visibility* — old
 * swipes, messages, and archived chats stay as they were (per spec).
 */
export const blockService = {
  /** Block a user. Idempotent; archives any shared match/conversation. */
  async blockUser(
    blockerUserId: string,
    input: CreateBlockInput,
  ): Promise<BlockRecord> {
    if (input.userId === blockerUserId) {
      throw badRequest('You cannot block yourself');
    }

    // Idempotent: if already blocked, just return the existing record.
    const existing = await blockRepository.findBlock(
      supabaseAdmin,
      blockerUserId,
      input.userId,
    );
    if (existing) return existing;

    const record = await blockRepository.createBlock(
      supabaseAdmin,
      blockerUserId,
      input.userId,
      input.reason,
    );

    // Immediately archive any shared match + its conversation so the chat
    // disappears. Old messages remain in the (archived) conversation.
    await this.archiveSharedThreads(blockerUserId, input.userId);

    return record;
  },

  /** Unblock a user. Restores visibility only; history is untouched. */
  async unblockUser(
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<void> {
    await blockRepository.deleteBlock(
      supabaseAdmin,
      blockerUserId,
      blockedUserId,
    );
  },

  /** List the caller's blocked users (with minimal profile info). */
  async listBlockedUsers(blockerUserId: string): Promise<BlockedUser[]> {
    return blockRepository.listBlocks(supabaseAdmin, blockerUserId);
  },

  /**
   * Reusable gate: throw `forbidden` if either user has blocked the other.
   * Used by profile viewing, swipe (LIKE), and chat messaging so the rule is
   * enforced in exactly one place.
   */
  async requireNotBlocked(a: string, b: string): Promise<void> {
    const blocked = await blockRepository.isBlockedEitherWay(
      supabaseAdmin,
      a,
      b,
    );
    if (blocked) {
      throw forbidden('Action not allowed: a block exists between these users');
    }
  },

  /** Archive any match + conversation shared by the two users. */
  async archiveSharedThreads(a: string, b: string): Promise<void> {
    const match = await matchRepository.findMatchBetween(
      supabaseAdmin,
      a,
      b,
    );
    if (match) {
      await matchRepository.archiveMatches(supabaseAdmin, [match.id]);
      await conversationRepository.archiveByMatch(supabaseAdmin, match.id);
    }
  },
};

// Re-export so callers can check visibility without importing the repository.
export { blockRepository };
