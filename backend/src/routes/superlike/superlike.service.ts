import { supabaseAdmin } from '../../config/supabase';
import { AppError, badRequest, conflict } from '../../utils/errors';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import { swipeService } from '../swipe/swipe.service';
import { swipeRepository } from '../swipe/swipe.repository';
import { featureUsageService } from '../feature-usage/feature-usage.service';
import { superLikeRepository } from './superlike.repository';
import {
  SuperLikeRecord,
  SuperLikeReceived,
} from './superlike.types';

/**
 * Super Like service.
 *
 * Why: Orchestrates the premium Super Like action by REUSING existing platforms:
 *  - permission: `requireFeature('super_like')` (route guard) + daily limit via
 *    the feature-usage module (resolved from subscription features).
 *  - swipe: delegates to `swipeService.recordSwipe` with a `SUPER_LIKE` action,
 *    reusing the swipe + match engine (a mutual super-like still creates a
 *    match).
 *  - event: records a `super_likes` row (dedup via unique index) and publishes a
 *    `super_like.received` domain event so the recipient is notified. The
 *    recommendation engine reads super-likers to prioritize the sender.
 */
export const superLikeService = {
  /**
   * Send a Super Like to another user. Enforces the daily limit, reuses the
   * swipe engine, records the event, and notifies the recipient.
   */
  async sendSuperLike(
    fromUserId: string,
    toUserId: string,
  ): Promise<{
    superLike: SuperLikeRecord;
    matched: boolean;
    matchId: string | null;
  }> {
    if (fromUserId === toUserId) {
      throw badRequest('You cannot super like yourself');
    }

    // 1) Enforce the daily limit (resolves cap from subscription features).
    await featureUsageService.checkAndConsume(fromUserId, 'super_like');

    // 2) Reuse the swipe engine (persists the SUPER_LIKE action + match logic).
    const result = await swipeService.recordSwipe(fromUserId, {
      toUserId,
      action: 'SUPER_LIKE',
    });

    // 3) Record the super-like event (dedup via unique index → 409 if repeat).
    let row;
    try {
      row = await superLikeRepository.createSuperLike(
        supabaseAdmin,
        fromUserId,
        toUserId,
      );
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 409) {
        throw conflict('You have already super liked this user.');
      }
      throw err;
    }

    // 4) Notify the recipient (the notification module subscribes + delivers).
    const target = await swipeRepository.getTargetProfile(supabaseAdmin, fromUserId);
    emit(NOTIFICATION_EVENTS.SUPER_LIKE_RECEIVED, {
      userId: toUserId,
      actorId: fromUserId,
      actorName: target?.displayName ?? null,
      superLikeId: row.id,
    });

    return {
      superLike: {
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        createdAt: row.created_at,
      },
      matched: result.matched,
      matchId: result.matchId,
    };
  },

  /** The caller's sent super-like history. */
  async getHistory(fromUserId: string): Promise<SuperLikeRecord[]> {
    const rows = await superLikeRepository.getHistory(supabaseAdmin, fromUserId);
    return rows.map((r) => ({
      id: r.id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      createdAt: r.created_at,
    }));
  },

  /** The super likes the caller has RECEIVED (for the "who liked you" surface). */
  async getReceived(
    viewerId: string,
  ): Promise<SuperLikeReceived[]> {
    const { data, error } = await supabaseAdmin
      .from('super_likes')
      .select('id, from_user_id, created_at')
      .eq('to_user_id', viewerId)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(500, error.message);
    return ((data as Array<{ id: string; from_user_id: string; created_at: string }>) ?? []).map(
      (r) => ({
        id: r.id,
        fromUserId: r.from_user_id,
        createdAt: r.created_at,
      }),
    );
  },
};

