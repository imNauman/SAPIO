import { z } from 'zod';

/**
 * Chat domain types + validation.
 *
 * Why: Messaging is gated on an ACTIVE match. A conversation is 1:1 with a
 * match (one active conversation per match) and is created lazily on the first
 * message. Messages are soft-deleted (deleted_at). These types are the contract
 * between the controller, service, and repositories. Realtime (WebSockets) is a
 * future milestone — this module is polling-friendly (GET endpoints return the
 * latest state).
 */

/** Maximum allowed message length (characters). */
export const MAX_MESSAGE_LENGTH = 4000;

/** Allowed message types. */
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

/** A persisted conversation (server shape). */
export interface ConversationRecord {
  id: string;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isActive: boolean;
  unreadCount: number;
}

/** A persisted message (server shape). */
export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageTypeValue;
  text: string | null;
  imageUrl: string | null;
  /** Delivery status: 'sent' -> 'delivered' -> 'read'. */
  status: MessageStatus;
  readAt: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

/** Message delivery status. */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/** A lightweight typing event (ephemeral, never persisted). */
export interface TypingEvent {
  conversationId: string;
  userId: string;
  /** 'start' when typing begins, 'stop' when it ends or times out. */
  state: 'start' | 'stop';
}

/** A conversation enriched with the counterpart's profile (for the UI). */
export interface ConversationWithProfile {
  id: string;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isActive: boolean;
  /** Number of messages the viewer has not yet read. */
  unreadCount: number;
  /** True when the counterpart is currently typing (ephemeral). */
  isTyping: boolean;
  /** True when the counterpart was active within the online window. */
  counterpartOnline: boolean;
  /** The other participant (not the requesting user). */
  counterpart: ChatUserProfile;
  /** The most recent message, if any (for preview rendering). */
  lastMessage: MessageRecord | null;
}

/** Minimal profile info for the chat counterpart. */
export interface ChatUserProfile {
  userId: string;
  displayName: string | null;
  username: string | null;
  primaryPhotoUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
}

/** Request body for POST /chat/send. */
export interface SendMessageInput {
  matchId: string;
  text?: string;
  imageUrl?: string;
}

/** Request body for PATCH /chat/message/:id (edit). */
export interface EditMessageInput {
  text: string;
}

/** Request body for POST /chat/typing. */
export interface TypingInput {
  conversationId: string;
  state: 'start' | 'stop';
}

/** Zod schema for POST /chat/typing. */
export const typingSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  state: z.enum(['start', 'stop']),
});

export type TypingBody = z.infer<typeof typingSchema>;

/** Request body for PATCH /messages/read. */
export interface MarkReadInput {
  conversationId: string;
}

/** Zod schema for PATCH /messages/read. */
export const markReadSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
});

export type MarkReadBody = z.infer<typeof markReadSchema>;

/** Query for GET /messages (paginated history). */
export interface MessageHistoryQuery {
  conversationId: string;
  /** Exclusive cursor: return messages BEFORE this id (older). */
  before?: string;
  limit?: number;
}

/** Zod schema for GET /messages query. */
export const messageHistorySchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  before: z.string().uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(30),
});

export type MessageHistoryQueryBody = z.infer<typeof messageHistorySchema>;

/** Zod schema for POST /chat/send. */
export const sendMessageSchema = z
  .object({
    matchId: z.string().uuid('matchId must be a valid UUID'),
    text: z
      .string()
      .max(
        MAX_MESSAGE_LENGTH,
        `Message must be at most ${MAX_MESSAGE_LENGTH} characters`,
      )
      .optional(),
    imageUrl: z.string().url('imageUrl must be a valid URL').optional(),
  })
  .refine((v) => v.text != null || v.imageUrl != null, {
    message: 'A message must contain text or an image',
  });

export type SendMessageBody = z.infer<typeof sendMessageSchema>;

/** Zod schema for PATCH /chat/message/:id. */
export const editMessageSchema = z.object({
  text: z
    .string()
    .min(1, 'Message text cannot be empty')
    .max(
      MAX_MESSAGE_LENGTH,
      `Message must be at most ${MAX_MESSAGE_LENGTH} characters`,
    ),
});

export type EditMessageBody = z.infer<typeof editMessageSchema>;
