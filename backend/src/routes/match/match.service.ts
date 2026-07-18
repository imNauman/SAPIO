import { supabaseAdmin } from '../../config/supabase';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { matchRepository, orderPair } from './match.repository';
import {
  MatchRecord,
  MatchWithProfile,
  MatchUserProfile,
} from './match.types';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';

/**
 * Match service.
 *
 * Why: Encapsulates the mutual-like matching rules. The core invariant: a match
 * exists ONLY when A likes B AND B already liked A. We order the pair
 * deterministically (smaller UUID = user_one_id) so the unique index prevents
 * duplicates regardless of who liked first. PASS actions never create matches.
 * Inactive / blocked / deleted counterpart profiles are filtered out of the
 * list. All Supabase access goes through `matchRepository`.
 */
export const matchService = {
  /**
   * Called by the swipe flow AFTER a successful LIKE. Returns whether a match
   * was created and, if so, the match + the matched user's profile.
   *
   * Rules:
   *  - Only LIKE triggers matching (PASS is ignored → matched:false).
   *  - If the target had NOT already liked the current user → matched:false.
   *  - If the target HAD already liked the current user → create the match
   *    (idempotent: a duplicate insert returns 409 and we treat it as already
   *    matched) and return matched:true with the counterpart profile.
   */
  async processLike(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{
    matched: boolean;
    matchId: string | null;
    matchedUser: MatchUserProfile | null;
  }> {
    if (currentUserId === targetUserId) {
      throw badRequest('You cannot match yourself');
    }

    // Did the target already LIKE the current user? If not, no match yet.
    const targetLikedBack = await matchRepository.hasLiked(
      supabaseAdmin,
      targetUserId,
      currentUserId,
    );
    if (!targetLikedBack) {
      return { matched: false, matchId: null, matchedUser: null };
    }

    // Mutual like confirmed → create the match (ordered pair).
    const { userOneId, userTwoId } = orderPair(currentUserId, targetUserId);
    let match: MatchRecord;
    try {
      match = await matchRepository.createMatch(
        supabaseAdmin,
        userOneId,
        userTwoId,
      );
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 409) {
        // Already matched (the other user created it first). Reuse it.
        const existing = await matchRepository.findMatch(
          supabaseAdmin,
          userOneId,
          userTwoId,
        );
        if (existing) match = existing;
        else throw conflict('Match already exists');
      } else {
        throw err;
      }
    }

    // The "matched user" is the counterpart (not the current user).
    const counterpartUserId =
      match.userOneId === currentUserId ? match.userTwoId : match.userOneId;

    const profile = await matchRepository.getCounterpartProfile(
      supabaseAdmin,
      counterpartUserId,
      currentUserId,
    );

    // Publish a domain event (the notification module subscribes + delivers).
    // We never send notifications directly from business logic.
    emit(NOTIFICATION_EVENTS.MATCH_CREATED, {
      userId: counterpartUserId,
      actorId: currentUserId,
      actorName: profile?.displayName ?? null,
      matchId: match.id,
    });

    return {
      matched: true,
      matchId: match.id,
      matchedUser: profile,
    };
  },

  /** List the current user's matches, enriched with the counterpart profile. */
  async listMatches(currentUserId: string): Promise<MatchWithProfile[]> {
    const matches = await matchRepository.getMatchesForUser(
      supabaseAdmin,
      currentUserId,
    );

    const result: MatchWithProfile[] = [];
    for (const m of matches) {
      const counterpartUserId =
        m.userOneId === currentUserId ? m.userTwoId : m.userOneId;

      const profile = await matchRepository.getCounterpartProfile(
        supabaseAdmin,
        counterpartUserId,
        currentUserId,
      );
      // Ignore matches whose counterpart is inactive / blocked / deleted.
      if (!profile) continue;

      result.push({
        id: m.id,
        matchedUserId: counterpartUserId,
        matchedUser: profile,
        createdAt: m.createdAt,
        matchedAt: m.matchedAt,
        isActive: m.isActive,
      });
    }
    return result;
  },

  /** Fetch a single match by id; 404 if it doesn't belong to the user. */
  async getMatch(currentUserId: string, id: string): Promise<MatchWithProfile> {
    const m = await matchRepository.getMatchById(supabaseAdmin, id);
    if (!m) throw notFound('Match not found');
    if (m.userOneId !== currentUserId && m.userTwoId !== currentUserId) {
      throw notFound('Match not found');
    }
    const counterpartUserId =
      m.userOneId === currentUserId ? m.userTwoId : m.userOneId;
    const profile = await matchRepository.getCounterpartProfile(
      supabaseAdmin,
      counterpartUserId,
      currentUserId,
    );
    if (!profile) throw notFound('Match not found');
    return {
      id: m.id,
      matchedUserId: counterpartUserId,
      matchedUser: profile,
      createdAt: m.createdAt,
      matchedAt: m.matchedAt,
      isActive: m.isActive,
    };
  },

  /** Delete a match owned by the user. */
  async deleteMatch(currentUserId: string, id: string): Promise<void> {
    const m = await matchRepository.getMatchById(supabaseAdmin, id);
    if (!m) throw notFound('Match not found');
    if (m.userOneId !== currentUserId && m.userTwoId !== currentUserId) {
      throw notFound('Match not found');
    }
    await matchRepository.deleteMatch(supabaseAdmin, id);
  },

  /** Bulk-archive matches owned by the user. */
  async archiveMatches(currentUserId: string, ids: string[]): Promise<number> {
    // Verify ownership of every id before archiving.
    const matches = await matchRepository.getMatchesForUser(
      supabaseAdmin,
      currentUserId,
    );
    const owned = new Set(matches.map((m) => m.id));
    const safeIds = ids.filter((id) => owned.has(id));
    if (safeIds.length === 0) return 0;
    return matchRepository.archiveMatches(supabaseAdmin, safeIds);
  },
};
