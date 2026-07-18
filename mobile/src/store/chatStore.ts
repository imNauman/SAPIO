import { create } from 'zustand';
import { chatApi, Conversation, Message } from '../lib/api/chat.api';

/**
 * Chat store (Zustand).
 *
 * Why: Single source of truth for the user's conversations and the open
 * conversation's messages. `conversations` backs `ChatListScreen`;
 * `currentConversation` + `messages` back `ConversationScreen`. `sendMessage`
 * posts via `chatApi` and appends the returned message optimistically-free
 * (we trust the server echo). `loadConversation` fetches a thread;
 * `refreshChats` re-pulls the list. All HTTP lives in `chat.api`; this store is
 * a thin state container. Realtime (WebSockets) is a future milestone, so this
 * store is polling-friendly.
 */
interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;

  // Chat-experience upgrade state.
  /** Ephemeral typing users per conversation id. */
  typingUsers: Record<string, string[]>;
  /** Messages pending retry (failed sends) keyed by a local temp id. */
  pendingMessages: Record<string, Message>;
  /** Whether older messages exist for the open conversation. */
  hasMore: boolean;
  /** Loading older messages (pagination). */
  loadingOlder: boolean;

  /** Load the caller's conversation list. */
  refreshChats: () => Promise<void>;
  /** Open a conversation: fetch it + its messages. */
  loadConversation: (conversationId: string) => Promise<void>;
  /** Send a message in the current conversation (requires a match). */
  sendMessage: (
    matchId: string,
    text: string,
    imageUrl?: string,
  ) => Promise<void>;
  /** Clear the open conversation (e.g. on navigating back). */
  clearCurrent: () => void;
  /** Clear all chat state (e.g. on logout). */
  clear: () => void;

  // Chat-experience upgrade actions.
  /** Record a remote typing signal for a conversation. */
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  /** Mark a conversation read locally (after the API call). */
  markConversationRead: (conversationId: string) => void;
  /** Load older messages and prepend them (pagination). */
  loadOlderMessages: (conversationId: string) => Promise<void>;
  /** Queue a failed message for retry. */
  queueFailed: (tempId: string, message: Message) => void;
  /** Retry a previously failed message. */
  retryMessage: (tempId: string, matchId: string) => Promise<void>;
  /** Update a message's status (delivered/read) from a server echo. */
  updateMessageStatus: (
    messageId: string,
    status: Message['status'],
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  loadingMessages: false,
  error: null,

  typingUsers: {},
  pendingMessages: {},
  hasMore: false,
  loadingOlder: false,

  refreshChats: async () => {
    set({ loading: true, error: null });
    try {
      const conversations = await chatApi.listConversations();
      set({ conversations, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load chats',
      });
    }
  },

  loadConversation: async (conversationId) => {
    set({ loadingMessages: true, error: null, hasMore: false });
    try {
      const { conversation, messages } = await chatApi.getConversation(
        conversationId,
      );
      set({
        currentConversation: conversation,
        messages,
        hasMore: messages.length >= 30,
        loadingMessages: false,
      });
    } catch (e) {
      set({
        loadingMessages: false,
        error: e instanceof Error ? e.message : 'Failed to load conversation',
      });
    }
  },

  sendMessage: async (matchId, text, imageUrl) => {
    const trimmed = text.trim();
    if (!trimmed && !imageUrl) return;
    const current = get().currentConversation;
    try {
      const message = await chatApi.send({
        matchId,
        text: trimmed || undefined,
        imageUrl,
      });
      set((state) => ({
        messages: [...state.messages, message],
        // Keep the conversation list preview fresh.
        conversations: state.conversations.map((c) =>
          c.id === current?.id
            ? {
                ...c,
                lastMessage: message,
                lastMessagePreview: message.text ?? '📷 Photo',
                lastMessageAt: message.createdAt,
              }
            : c,
        ),
      }));
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to send message',
      });
      throw e;
    }
  },

  clearCurrent: () =>
    set({
      currentConversation: null,
      messages: [],
      loadingMessages: false,
      hasMore: false,
      loadingOlder: false,
    }),

  clear: () =>
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      loadingMessages: false,
      error: null,
      typingUsers: {},
      pendingMessages: {},
      hasMore: false,
      loadingOlder: false,
    }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      const next = isTyping
        ? Array.from(new Set([...current, userId]))
        : current.filter((id) => id !== userId);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: next },
      };
    }),

  markConversationRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
      currentConversation:
        state.currentConversation?.id === conversationId
          ? { ...state.currentConversation, unreadCount: 0 }
          : state.currentConversation,
    })),

  loadOlderMessages: async (conversationId) => {
    const { messages, hasMore, loadingOlder } = get();
    if (loadingOlder || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    set({ loadingOlder: true });
    try {
      const { messages: older, hasMore: more } = await chatApi.getMessages(
        conversationId,
        oldest.id,
        30,
      );
      set((state) => ({
        messages: [...older, ...state.messages],
        hasMore: more,
        loadingOlder: false,
      }));
    } catch {
      set({ loadingOlder: false });
    }
  },

  queueFailed: (tempId, message) =>
    set((state) => ({
      pendingMessages: { ...state.pendingMessages, [tempId]: message },
    })),

  retryMessage: async (tempId, matchId) => {
    const failed = get().pendingMessages[tempId];
    if (!failed) return;
    try {
      const message = await chatApi.send({
        matchId,
        text: failed.text ?? undefined,
        imageUrl: failed.imageUrl ?? undefined,
      });
      set((state) => {
        const { [tempId]: _removed, ...rest } = state.pendingMessages;
        return {
          pendingMessages: rest,
          messages: [...state.messages, message],
        };
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Retry failed',
      });
    }
  },

  updateMessageStatus: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, status } : m,
      ),
    })),
}));
