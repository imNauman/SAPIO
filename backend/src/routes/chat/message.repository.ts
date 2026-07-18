import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../utils/errors';
import { MessageRecord, MessageTypeValue } from './chat.types';

/**
 * Message repository — the query layer for `messages`.
 *
 * Why: All raw Supabase access for messages lives here. The service stays
 * declarative and never touches the client directly. Messages are soft-deleted
 * (deleted_at is set, the row is retained) so the counterpart keeps their copy
 * of history. We use the admin client so server-side writes bypass RLS (the
 * request is already authenticated and the sender/participant ids are forced by
 * the service).
 */
const TABLE = 'messages';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  text: string | null;
  image_url: string | null;
  status: string;
  read_at: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

function mapRow(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageType: row.message_type as MessageTypeValue,
    text: row.text,
    imageUrl: row.image_url,
    status: row.status as MessageRecord['status'],
    readAt: row.read_at,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  };
}

export const messageRepository = {
  /** Insert a message. Returns the created row (status defaults to 'sent'). */
  async create(
    client: SupabaseClient,
    input: {
      conversationId: string;
      senderId: string;
      messageType: MessageTypeValue;
      text?: string | null;
      imageUrl?: string | null;
    },
  ): Promise<MessageRecord> {
    const { data, error } = await client
      .from(TABLE)
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        message_type: input.messageType,
        text: input.text ?? null,
        image_url: input.imageUrl ?? null,
        status: 'sent',
      })
      .select(
        'id, conversation_id, sender_id, message_type, text, image_url, status, read_at, created_at, edited_at, deleted_at',
      )
      .single();
    if (error) throw new AppError(500, error.message);
    return mapRow(data as MessageRow);
  },

  /** Fetch a single message by id (ownership verified by the service). */
  async findById(
    client: SupabaseClient,
    id: string,
  ): Promise<MessageRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, conversation_id, sender_id, message_type, text, image_url, created_at, edited_at, deleted_at',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    return mapRow(data as MessageRow);
  },

  /** List messages for a conversation, oldest first (chat order). */
  async listForConversation(
    client: SupabaseClient,
    conversationId: string,
  ): Promise<MessageRecord[]> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, conversation_id, sender_id, message_type, text, image_url, status, read_at, created_at, edited_at, deleted_at',
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new AppError(500, error.message);
    return ((data as unknown[]) ?? []).map((r) => mapRow(r as MessageRow));
  },

  /**
   * Paginated history: return the `limit` messages immediately BEFORE `before`
   * (exclusive cursor), newest-first within the page. The caller reverses for
   * display. Used for "load older messages on scroll" without pulling full
   * history.
   */
  async listBefore(
    client: SupabaseClient,
    conversationId: string,
    beforeId: string | undefined,
    limit: number,
  ): Promise<MessageRecord[]> {
    let query = client
      .from(TABLE)
      .select(
        'id, conversation_id, sender_id, message_type, text, image_url, status, read_at, created_at, edited_at, deleted_at',
      )
      .eq('conversation_id', conversationId);
    if (beforeId) {
      // Only messages created strictly before the cursor message's timestamp.
      const { data: cursorRow } = await client
        .from(TABLE)
        .select('created_at')
        .eq('id', beforeId)
        .maybeSingle();
      if (cursorRow) {
        query = query.lt('created_at', (cursorRow as { created_at: string }).created_at);
      }
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new AppError(500, error.message);
    return ((data as unknown[]) ?? []).map((r) => mapRow(r as MessageRow));
  },

  /**
   * Mark messages in a conversation as 'read' for the recipient. Sets status=
   * 'read' and read_at for every message not sent by `recipientId` that is
   * still 'delivered' (or 'sent'). Returns the count updated.
   */
  async markReadForRecipient(
    client: SupabaseClient,
    conversationId: string,
    recipientId: string,
  ): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(TABLE)
      .update({ status: 'read', read_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', recipientId)
      .in('status', ['sent', 'delivered'])
      .select('id');
    if (error) throw new AppError(500, error.message);
    return ((data as unknown[]) ?? []).length;
  },

  /**
   * Mark a single message as 'delivered' (reached the backend / recipient
   * session). Only advances 'sent' -> 'delivered' (never skips to 'read' here).
   */
  async markDelivered(
    client: SupabaseClient,
    messageId: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ status: 'delivered' })
      .eq('id', messageId)
      .eq('status', 'sent');
    if (error) throw new AppError(500, error.message);
  },

  /** Soft-edit a message's text (sender only). Sets edited_at. */
  async edit(
    client: SupabaseClient,
    id: string,
    text: string,
  ): Promise<MessageRecord> {
    const { data, error } = await client
      .from(TABLE)
      .update({ text, edited_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, conversation_id, sender_id, message_type, text, image_url, created_at, edited_at, deleted_at',
      )
      .single();
    if (error) throw new AppError(500, error.message);
    return mapRow(data as MessageRow);
  },

  /** Soft-delete a message (sender only). Sets deleted_at. */
  async softDelete(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new AppError(500, error.message);
  },
};
