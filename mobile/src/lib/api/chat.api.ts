import { apiClient } from '../apiClient';

/**
 * Chat API module.
 *
 * Why: Wraps calls to the SAPIO backend `/api/chat` endpoints. The mobile app
 * sends the Supabase JWT via the `apiClient` interceptor. These functions are
 * the only place that knows about chat HTTP details — the chat store calls
 * these, keeping the UI decoupled from transport. Messaging is gated on an
 * active match server-side; the client just sends `matchId` and the server
 * creates the conversation lazily. Realtime (WebSockets) is a future milestone,
 * so these reads are polling-friendly.
 */
export type MessageType = 'text' | 'image';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatUserProfile {
  userId: string;
  displayName: string | null;
  username: string | null;
  primaryPhotoUrl: string | null;
  isVerified: boolean;
  isPremium: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  status: MessageStatus;
  readAt: string | null;
}

export interface Conversation {
  id: string;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isActive: boolean;
  unreadCount: number;
  isTyping: boolean;
  counterpartOnline: boolean;
  counterpart: ChatUserProfile;
  lastMessage: Message | null;
}

export interface SendMessageInput {
  matchId: string;
  text?: string;
  imageUrl?: string;
}

export interface MessageHistory {
  messages: Message[];
  hasMore: boolean;
}

export const chatApi = {
  /** Fetch the caller's conversations. */
  async listConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get<{ data: { conversations: Conversation[] } }>(
      '/chat/conversations',
    );
    return data.data.conversations;
  },

  /** Fetch a single conversation + its messages. */
  async getConversation(
    conversationId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const { data } = await apiClient.get<{
      data: { conversation: Conversation; messages: Message[] };
    }>(`/chat/${conversationId}`);
    return data.data;
  },

  /** Get-or-create the conversation for a match (open chat from a match id). */
  async getByMatch(
    matchId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const { data } = await apiClient.get<{
      data: { conversation: Conversation; messages: Message[] };
    }>(`/chat/by-match/${matchId}`);
    return data.data;
  },

  /** Send a message (creates the conversation if needed). */
  async send(input: SendMessageInput): Promise<Message> {
    const { data } = await apiClient.post<{ data: { message: Message } }>(
      '/chat/send',
      input,
    );
    return data.data.message;
  },

  /** Edit a message the caller sent. */
  async editMessage(id: string, text: string): Promise<Message> {
    const { data } = await apiClient.patch<{ data: { message: Message } }>(
      `/chat/message/${id}`,
      { text },
    );
    return data.data.message;
  },

  /** Soft-delete a message the caller sent. */
  async deleteMessage(id: string): Promise<void> {
    await apiClient.delete(`/chat/message/${id}`);
  },

  /** Send a typing signal (start/stop) for a conversation. */
  async sendTyping(
    conversationId: string,
    state: 'start' | 'stop',
  ): Promise<void> {
    await apiClient.post('/chat/typing', { conversationId, state });
  },

  /** Mark a conversation's messages read for the current user. */
  async markRead(conversationId: string): Promise<{ marked: number }> {
    const { data } = await apiClient.patch<{ data: { marked: number } }>(
      '/chat/messages/read',
      { conversationId },
    );
    return data.data;
  },

  /**
   * Paginated history. `before` is an optional message id cursor; `limit`
   * defaults to 30. Returns oldest-first with a `hasMore` flag.
   */
  async getMessages(
    conversationId: string,
    before?: string,
    limit = 30,
  ): Promise<MessageHistory> {
    const params: Record<string, string | number> = { conversationId, limit };
    if (before) params.before = before;
    const { data } = await apiClient.get<{ data: MessageHistory }>(
      '/chat/messages',
      { params },
    );
    return data.data;
  },

  /**
   * Upload a chat image (multipart). `onProgress` receives 0..1. Returns the
   * public image + thumbnail URLs to attach to a message.
   */
  async uploadImage(
    uri: string,
    onProgress?: (fraction: number) => void,
  ): Promise<{ imageUrl: string; thumbnailUrl: string }> {
    const form = new FormData();
    // React Native: FormData accepts a local file descriptor object.
    form.append('image', {
      uri,
      name: 'chat-image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<{
      data: { imageUrl: string; thumbnailUrl: string };
    }>('/chat/messages/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e: { loaded: number; total?: number }) =>
            onProgress(e.total ? e.loaded / e.total : 0)
        : undefined,
    });
    return data.data;
  },
};
