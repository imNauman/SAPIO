import { supabaseAdmin } from '../../config/supabase';
import { badRequest, forbidden, notFound } from '../../utils/errors';
import { matchRepository } from '../match/match.repository';
import { blockService } from '../block/block.service';
import { profileRepo } from '../profile/profile.repository';
import {
  conversationRepository,
  ONLINE_WITHIN_MINUTES,
} from './conversation.repository';
import { messageRepository } from './message.repository';
import { chatImageRepository } from './chat-image.repository';
import { emit } from '../../events/eventBus';
import { NOTIFICATION_EVENTS } from '../../events/notificationEvents';
import {
  ChatUserProfile,
  ConversationRecord,
  ConversationWithProfile,
  EditMessageInput,
  MessageRecord,
  SendMessageInput,
  TypingInput,
} from './chat.types';

/**
 * Ephemeral typing state. Keyed by `${conversationId}:${userId}`. We do NOT
 * persist typing — per spec it is transient. A TTL auto-stops typing after
 * TYPING_TTL_MS so a dropped client doesn't leave a stuck "typing…" indicator.
 */
const TYPING_TTL_MS = 5000;
const typingTimers = new Map<string, NodeJS.Timeout>();
const typingState = new Map<string, boolean>();

/**
 * Chat service.
 *
 * Why: Encapsulates the messaging business rules. The cardinal rule: messaging
 * is allowed ONLY between participants of an ACTIVE match. Every operation
 * therefore (1) loads the match, (2) verifies it is active and the caller is a
 * participant, and (3) only then touches conversations/messages. Conversations
 * are created lazily (one active conversation per match) and messages are
 * soft-deleted. All Supabase access goes through the repositories. Realtime
 * (WebSockets) is a future milestone — these reads are polling-friendly.
 */
export const chatService = {
  /**
   * List the caller's conversations, enriched with the counterpart profile and
   * the latest message. Only matches the caller participates in are visible.
   */
  async listConversations(
    currentUserId: string,
  ): Promise<ConversationWithProfile[]> {
    const matchIds = await this.matchIdsForUser(currentUserId);
    if (matchIds.length === 0) return [];

    const conversations = await conversationRepository.listForMatches(
      supabaseAdmin,
      matchIds,
    );

    const result: ConversationWithProfile[] = [];
    for (const conv of conversations) {
      const enriched = await this.enrich(currentUserId, conv);
      if (enriched) result.push(enriched);
    }
    return result;
  },

  /** Fetch a single conversation (with counterpart + messages) if allowed. */
  async getConversation(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ conversation: ConversationWithProfile; messages: MessageRecord[] }> {
    const conv = await conversationRepository.findById(
      supabaseAdmin,
      conversationId,
    );
    if (!conv) throw notFound('Conversation not found');

    // Verify the caller participates in the underlying match.
    await this.requireParticipant(currentUserId, conv.matchId);

    const enriched = await this.enrich(currentUserId, conv);
    if (!enriched) throw notFound('Conversation not found');

    const messages = await messageRepository.listForConversation(
      supabaseAdmin,
      conv.id,
    );
    return { conversation: enriched, messages };
  },

  /**
   * Get-or-create the conversation for a match, then return it with messages.
   * Used when the client only knows the `matchId` (e.g. tapping a match card).
   * The match gate still applies — no active match, no conversation.
   */
  async getOrCreateByMatch(
    currentUserId: string,
    matchId: string,
  ): Promise<{ conversation: ConversationWithProfile; messages: MessageRecord[] }> {
    // Gate: active match + caller is a participant.
    const match = await this.requireParticipant(currentUserId, matchId);

    const conv = await conversationRepository.getOrCreate(
      supabaseAdmin,
      match.id,
    );

    const enriched = await this.enrich(currentUserId, conv);
    if (!enriched) throw notFound('Conversation not found');

    const messages = await messageRepository.listForConversation(
      supabaseAdmin,
      conv.id,
    );
    return { conversation: enriched, messages };
  },

  /**
   * Send a message. Validates an active match exists, gets-or-creates the
   * conversation, inserts the message, and updates the conversation preview.
   * Returns the created message.
   */
  async sendMessage(
    currentUserId: string,
    input: SendMessageInput,
  ): Promise<MessageRecord> {
    if (!input.text && !input.imageUrl) {
      throw badRequest('A message must contain text or an image');
    }

    // Gate: active match + caller is a participant.
    const match = await this.requireParticipant(currentUserId, input.matchId);

    // Sending a message counts as activity (drives the "hide inactive" filter).
    await profileRepo.touchActivity(currentUserId).catch(() => {});

    // Get or create the single active conversation for this match.
    const conv = await conversationRepository.getOrCreate(
      supabaseAdmin,
      match.id,
    );

    const messageType = input.imageUrl ? 'image' : 'text';
    const message = await messageRepository.create(supabaseAdmin, {
      conversationId: conv.id,
      senderId: currentUserId,
      messageType,
      text: input.text ?? null,
      imageUrl: input.imageUrl ?? null,
    });

    // The backend has received the message, so it is at least "delivered".
    // (In a push model "read" would be set when the recipient opens it.)
    await messageRepository.markDelivered(supabaseAdmin, message.id);
    // Re-read so the returned record reflects the delivered status.
    const delivered = await messageRepository.findById(supabaseAdmin, message.id);
    const result = delivered ?? message;

    // Update conversation preview + last_message_at.
    const preview = this.buildPreview(messageType, input.text);
    await conversationRepository.touch(
      supabaseAdmin,
      conv.id,
      preview,
      message.createdAt,
    );

    // Bump the recipient's unread counter atomically.
    const recipientId =
      match.userOneId === currentUserId ? match.userTwoId : match.userOneId;
    await conversationRepository
      .incrementUnread(supabaseAdmin, conv.id)
      .catch(() => {});

    // Publish a domain event for the RECIPIENT (the other match participant).
    // We never send notifications directly from business logic.
    const senderProfile = await profileRepo.findByUserId(currentUserId);
    emit(NOTIFICATION_EVENTS.MESSAGE_CREATED, {
      userId: recipientId,
      actorId: currentUserId,
      actorName: senderProfile?.displayName ?? null,
      conversationId: conv.id,
      matchId: match.id,
      preview,
    });

    return result;
  },

  /** Edit a message the caller sent (text only). */
  async editMessage(
    currentUserId: string,
    messageId: string,
    input: EditMessageInput,
  ): Promise<MessageRecord> {
    const message = await messageRepository.findById(supabaseAdmin, messageId);
    if (!message) throw notFound('Message not found');
    if (message.senderId !== currentUserId) {
      throw forbidden('You can only edit your own messages');
    }
    if (message.deletedAt) {
      throw badRequest('Cannot edit a deleted message');
    }
    return messageRepository.edit(supabaseAdmin, messageId, input.text);
  },

  /** Soft-delete a message the caller sent. */
  async deleteMessage(
    currentUserId: string,
    messageId: string,
  ): Promise<void> {
    const message = await messageRepository.findById(supabaseAdmin, messageId);
    if (!message) throw notFound('Message not found');
    if (message.senderId !== currentUserId) {
      throw forbidden('You can only delete your own messages');
    }
    await messageRepository.softDelete(supabaseAdmin, messageId);
  },

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Resolve the match ids the user participates in (active matches only). */
  async matchIdsForUser(currentUserId: string): Promise<string[]> {
    const matches = await matchRepository.getMatchesForUser(
      supabaseAdmin,
      currentUserId,
    );
    return matches
      .filter((m) => m.isActive)
      .map((m) => m.id);
  },

  /**
   * Verify the caller is a participant of an ACTIVE match. Throws 404/403
   * otherwise. Returns the match record on success.
   */
  async requireParticipant(
    currentUserId: string,
    matchId: string,
  ): Promise<{ id: string; userOneId: string; userTwoId: string; isActive: boolean }> {
    const match = await matchRepository.getMatchById(supabaseAdmin, matchId);
    if (!match) throw notFound('Match not found');
    if (!match.isActive) throw forbidden('This match is no longer active');
    if (match.userOneId !== currentUserId && match.userTwoId !== currentUserId) {
      throw forbidden('You are not a participant of this match');
    }
    // A blocked user (in either direction) cannot exchange messages.
    const counterpartId =
      match.userOneId === currentUserId ? match.userTwoId : match.userOneId;
    await blockService.requireNotBlocked(currentUserId, counterpartId);
    return match;
  },

  /** Enrich a conversation row with the counterpart profile + last message. */
  async enrich(
    currentUserId: string,
    conv: ConversationRecord,
  ): Promise<ConversationWithProfile | null> {
    const match = await matchRepository.getMatchById(
      supabaseAdmin,
      conv.matchId,
    );
    if (!match || !match.isActive) return null;

    const counterpartUserId =
      match.userOneId === currentUserId ? match.userTwoId : match.userOneId;

    const profile = await matchRepository.getCounterpartProfile(
      supabaseAdmin,
      counterpartUserId,
      currentUserId,
    );
    if (!profile) return null; // counterpart inactive/blocked/deleted

    const messages = await messageRepository.listForConversation(
      supabaseAdmin,
      conv.id,
    );
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    const typingKey = `${conv.id}:${counterpartUserId}`;
    const isTyping = typingState.get(typingKey) === true;
    const counterpartOnline = this.isOnline(profile?.lastActive ?? null);

    return {
      id: conv.id,
      matchId: conv.matchId,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
      isActive: conv.isActive,
      unreadCount: conv.unreadCount,
      isTyping,
      counterpartOnline,
      counterpart: profile as ChatUserProfile,
      lastMessage,
    };
  },

  /** Derive online status from last_active within ONLINE_WITHIN_MINUTES. */
  isOnline(lastActive: string | null): boolean {
    if (!lastActive) return false;
    const diffMin =
      (Date.now() - new Date(lastActive).getTime()) / 60000;
    return diffMin <= ONLINE_WITHIN_MINUTES;
  },

  /** Build a short preview string for the conversation list. */
  buildPreview(type: string, text?: string | null): string {
    if (type === 'image') return '📷 Photo';
    return (text ?? '').slice(0, 120);
  },

  /**
   * Record a typing signal. Persists nothing; updates the ephemeral map and
   * emits a `chat.typing` event for realtime subscribers. A TTL auto-stops
   * typing after TYPING_TTL_MS so a disconnected client can't leave a stuck
   * indicator. Blocked users are skipped by the match gate.
   */
  async setTyping(
    currentUserId: string,
    input: TypingInput,
  ): Promise<void> {
    // Gate: must be a participant of an active match for this conversation.
    const conv = await conversationRepository.findById(
      supabaseAdmin,
      input.conversationId,
    );
    if (!conv) throw notFound('Conversation not found');
    await this.requireParticipant(currentUserId, conv.matchId);

    const key = `${input.conversationId}:${currentUserId}`;
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    if (input.state === 'start') {
      typingState.set(key, true);
      // Auto-stop after the TTL.
      const timer = setTimeout(() => {
        typingState.set(key, false);
        typingTimers.delete(key);
        emit(NOTIFICATION_EVENTS.CHAT_TYPING, {
          conversationId: input.conversationId,
          userId: currentUserId,
          state: 'stop',
        });
      }, TYPING_TTL_MS);
      typingTimers.set(key, timer);
    } else {
      typingState.set(key, false);
    }

    emit(NOTIFICATION_EVENTS.CHAT_TYPING, {
      conversationId: input.conversationId,
      userId: currentUserId,
      state: input.state,
    });
  },

  /**
   * Mark all messages in a conversation as read for the caller (recipient) and
   * reset the conversation's unread counter. Called when the conversation is
   * opened. Returns the number of messages marked read.
   */
  async markRead(
    currentUserId: string,
    conversationId: string,
  ): Promise<{ marked: number }> {
    const conv = await conversationRepository.findById(
      supabaseAdmin,
      conversationId,
    );
    if (!conv) throw notFound('Conversation not found');
    await this.requireParticipant(currentUserId, conv.matchId);

    const marked = await messageRepository.markReadForRecipient(
      supabaseAdmin,
      conversationId,
      currentUserId,
    );
    await conversationRepository.markRead(supabaseAdmin, conversationId);
    return { marked };
  },

  /**
   * Paginated history. Returns up to `limit` messages strictly older than the
   * `before` cursor (by created_at), newest-first, so the client can prepend
   * them. When `before` is omitted, returns the most recent `limit` messages.
   */
  async getHistory(
    currentUserId: string,
    conversationId: string,
    before: string | undefined,
    limit: number,
  ): Promise<{ messages: MessageRecord[]; hasMore: boolean }> {
    const conv = await conversationRepository.findById(
      supabaseAdmin,
      conversationId,
    );
    if (!conv) throw notFound('Conversation not found');
    await this.requireParticipant(currentUserId, conv.matchId);

    const messages = await messageRepository.listBefore(
      supabaseAdmin,
      conversationId,
      before,
      limit,
    );
    // hasMore if we got a full page (there may be older messages).
    const hasMore = messages.length === limit;
    // Return oldest-first for prepending to the list.
    return { messages: messages.slice().reverse(), hasMore };
  },

  /**
   * Upload a chat image and return its public URLs. The image is stored in the
   * `chat-images` bucket under the sender's folder. The caller is responsible
   * for attaching the returned URL to a message via `sendMessage`.
   */
  async uploadImage(
    currentUserId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    const result = await chatImageRepository.upload(
      supabaseAdmin,
      currentUserId,
      file,
    );
    return { imageUrl: result.imageUrl, thumbnailUrl: result.thumbnailUrl };
  },
};
