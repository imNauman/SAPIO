import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../utils/errors';
import { ConversationRecord } from './chat.types';

/**
 * Conversation repository — the query layer for `conversations`.
 *
 * Why: All raw Supabase access for conversations lives here. The service stays
 * declarative and never touches the client directly. We use the admin client so
 * server-side writes bypass RLS (the request is already authenticated and the
 * participant ids are forced by the service). The unique constraint
 * `conversations_one_active_per_match` guarantees one active conversation per
 * match; a 409 on insert is treated as "already exists" and the existing row is
 * returned.
 */
const TABLE = 'conversations';

/** Online window: a user is "online" if active within this many minutes. */
export const ONLINE_WITHIN_MINUTES = 5;

interface ConversationRow {
  id: string;
  match_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  is_active: boolean;
  unread_count: number;
}

function mapRow(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    matchId: row.match_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    isActive: row.is_active,
    unreadCount: row.unread_count,
  };
}

/** Detect a unique-violation error from Postgres. */
function isDuplicateKey(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /duplicate key value violates unique constraint/i.test(msg);
}

export const conversationRepository = {
  /**
   * Find the active conversation for a match, or null. Used to reuse an
   * existing conversation instead of creating a duplicate.
   */
  async findByMatchId(
    client: SupabaseClient,
    matchId: string,
  ): Promise<ConversationRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, match_id, created_at, updated_at, last_message_at, last_message_preview, is_active',
      )
      .eq('match_id', matchId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    return mapRow(data as ConversationRow);
  },

  /**
   * Get or create the active conversation for a match. If one already exists
   * (including a 409 from a concurrent first message), it is returned.
   */
  async getOrCreate(
    client: SupabaseClient,
    matchId: string,
  ): Promise<ConversationRecord> {
    const existing = await this.findByMatchId(client, matchId);
    if (existing) return existing;

    const { data, error } = await client
      .from(TABLE)
      .insert({ match_id: matchId, is_active: true })
      .select(
        'id, match_id, created_at, updated_at, last_message_at, last_message_preview, is_active',
      )
      .single();

    if (error) {
      if (isDuplicateKey(error)) {
        // Race: another request created it first. Return the existing one.
        const retry = await this.findByMatchId(client, matchId);
        if (retry) return retry;
      }
      throw new AppError(500, error.message);
    }
    return mapRow(data as ConversationRow);
  },

  /** Fetch a conversation by id (ownership is verified by the service). */
  async findById(
    client: SupabaseClient,
    id: string,
  ): Promise<ConversationRecord | null> {
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, match_id, created_at, updated_at, last_message_at, last_message_preview, is_active',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw new AppError(500, error.message);
    if (!data) return null;
    return mapRow(data as ConversationRow);
  },

  /**
   * Update the conversation's last-message metadata (preview + timestamp) and
   * bump `updated_at`. Called after a message is inserted.
   */
  async touch(
    client: SupabaseClient,
    id: string,
    preview: string,
    at: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({
        last_message_preview: preview,
        last_message_at: at,
        updated_at: at,
      })
      .eq('id', id);
    if (error) throw new AppError(500, error.message);
  },

  /**
   * List the active conversations for a set of match ids (the user's matches),
   * newest activity first. Returns conversation rows only — profile enrichment
   * is done by the service. `matchIds` is resolved by the service from the
   * user's matches so we never expose conversations the user can't see.
   */
  async listForMatches(
    client: SupabaseClient,
    matchIds: string[],
  ): Promise<ConversationRecord[]> {
    if (matchIds.length === 0) return [];
    const { data, error } = await client
      .from(TABLE)
      .select(
        'id, match_id, created_at, updated_at, last_message_at, last_message_preview, is_active',
      )
      .eq('is_active', true)
      .in('match_id', matchIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw new AppError(500, error.message);
    return ((data as unknown[]) ?? []).map((r) =>
      mapRow(r as ConversationRow),
    );
  },

  /**
   * Archive (deactivate) the conversation for a match. Used when a block is
   * created so the chat disappears immediately. Old messages remain in the
   * (now inactive) conversation.
   */
  async archiveByMatch(
    client: SupabaseClient,
    matchId: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ is_active: false })
      .eq('match_id', matchId);
    if (error) throw new AppError(500, error.message);
  },

  /**
   * Clear the unread count for a conversation (called when the viewer opens
   * the thread). Idempotent — setting to 0 when already 0 is a no-op.
   */
  async markRead(
    client: SupabaseClient,
    id: string,
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ unread_count: 0 })
      .eq('id', id);
    if (error) throw new AppError(500, error.message);
  },

  /**
   * Increment the unread count for a conversation (called when a message is
   * delivered to a conversation the viewer is not currently reading). We only
   * bump it for the *recipient's* view; the sender never accrues unread.
   */
  async incrementUnread(
    client: SupabaseClient,
    id: string,
  ): Promise<void> {
    const { error } = await client.rpc('increment_unread', { conv_id: id });
    if (error) throw new AppError(500, error.message);
  },
};
