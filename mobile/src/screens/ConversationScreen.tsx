import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { chatApi } from '../lib/api/chat.api';
import { MessageBubble } from '../components/MessageBubble';
import { MessageInput } from '../components/MessageInput';
import { LoadingChatScreen } from '../components/LoadingChatScreen';
import { ReportModal } from '../components/ReportModal';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MessageStatusIcon, MessageStatusLabel } from '../components/chat/MessageStatusIcon';
import { RetryBubble } from '../components/chat/RetryBubble';
import { ImageMessageBubble } from '../components/chat/ImageMessageBubble';
import type { Message } from '../lib/api/chat.api';

/**
 * ConversationScreen — a single chat thread (chat-experience upgrade).
 *
 * Why: Loads the conversation + messages via `chatStore.loadConversation` on
 * mount (keyed by `conversationId` from params). Renders messages oldest-first
 * in a virtualized `FlatList` with: typing indicator under the header, read
 * receipts (status icons on own messages + mark-read on open), paginated lazy
 * loading of older messages (scroll-to-top), retry UI for failed sends, online
 * indicator, and image messages. `isOwn` is derived from `authStore.user.id`.
 * Realtime (WebSockets) is a future milestone, so typing/read state is driven
 * by polling + the store; the API already supports the events for when we add
 * a socket layer.
 */
export function ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as
    | { conversationId?: string; matchId?: string }
    | undefined;

  const currentConversation = useChatStore((s) => s.currentConversation);
  const messages = useChatStore((s) => s.messages);
  const loadingMessages = useChatStore((s) => s.loadingMessages);
  const hasMore = useChatStore((s) => s.hasMore);
  const loadingOlder = useChatStore((s) => s.loadingOlder);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const pendingMessages = useChatStore((s) => s.pendingMessages);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const markConversationRead = useChatStore((s) => s.markConversationRead);
  const retryMessage = useChatStore((s) => s.retryMessage);
  const clearCurrent = useChatStore((s) => s.clearCurrent);

  const userId = useAuthStore((s) => s.user?.id);
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reportMessage, setReportMessage] = React.useState<Message | null>(null);

  // Load thread on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (params?.conversationId) {
        await loadConversation(params.conversationId);
      } else if (params?.matchId) {
        const { conversation, messages: msgs } = await chatApi.getByMatch(
          params.matchId,
        );
        if (!cancelled) {
          useChatStore.setState({ currentConversation: conversation, messages: msgs });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearCurrent();
    };
  }, [params?.conversationId, params?.matchId, loadConversation, clearCurrent]);

  // Mark read on open + when new messages arrive.
  useEffect(() => {
    const id = currentConversation?.id;
    if (!id) return;
    markConversationRead(id);
    chatApi.markRead(id).catch(() => {});
  }, [currentConversation?.id, messages.length, markConversationRead]);

  // Auto-scroll to newest on new message (unless user is reading history).
  useEffect(() => {
    if (messages.length > 0 && !loadingOlder) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, loadingOlder]);

  // Header: name, verified, online dot.
  useEffect(() => {
    if (currentConversation?.counterpart) {
      const c = currentConversation.counterpart;
      const name = c.displayName || c.username || 'Chat';
      navigation.setOptions({
        title: name,
        headerRight: () => (
          <View style={styles.headerRight}>
            {currentConversation.counterpartOnline ? (
              <View style={styles.onlineDot} />
            ) : null}
            {c.isVerified ? <VerifiedBadge verified size="medium" /> : null}
          </View>
        ),
      });
    }
  }, [currentConversation, navigation]);

  // Typing indicator visibility for this conversation. Prefer the realtime map
  // (populated when a socket layer is added); fall back to the API-provided
  // `isTyping` flag so polling still surfaces typing in the header.
  const isTyping =
    !!currentConversation &&
    ((typingUsers[currentConversation.id]?.length ?? 0) > 0 ||
      currentConversation.isTyping);

  const handleSend = useCallback(
    (text: string) => {
      if (!currentConversation) return;
      void sendMessage(currentConversation.matchId, text);
    },
    [currentConversation, sendMessage],
  );

  // Emit a typing "start" signal, debounced with an auto "stop".
  const handleTyping = useCallback(() => {
    if (!currentConversation) return;
    chatApi.sendTyping(currentConversation.id, 'start').catch(() => {});
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      chatApi.sendTyping(currentConversation.id, 'stop').catch(() => {});
    }, 2500);
  }, [currentConversation]);

  const handleLoadOlder = useCallback(() => {
    if (currentConversation) void loadOlderMessages(currentConversation.id);
  }, [currentConversation, loadOlderMessages]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.senderId === userId;
      if (item.messageType === 'image' && item.imageUrl) {
        return (
          <ImageMessageBubble
            imageUrl={item.imageUrl}
            isOwn={isOwn}
            onPress={() => { /* open lightbox */ }}
          />
        );
      }
      return (
        <View>
          <MessageBubble
            message={item}
            isOwn={isOwn}
            onReport={(m) => setReportMessage(m)}
          />
          {isOwn ? (
            <View style={styles.statusRow}>
              <MessageStatusIcon status={item.status} />
              <MessageStatusLabel status={item.status} />
            </View>
          ) : null}
        </View>
      );
    },
    [userId, setReportMessage],
  );

  if (loadingMessages && messages.length === 0) {
    return <LoadingChatScreen />;
  }

  const pendingList = Object.values(pendingMessages);

  return (
    <View style={styles.container}>
      <TypingIndicator
        visible={isTyping}
        name={currentConversation?.counterpart.displayName}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item: Message) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        windowSize={10}
        onEndReachedThreshold={0.2}
        onScrollToIndexFailed={() => {}}
        ListHeaderComponent={
          hasMore ? (
            <View style={styles.older}>
              {loadingOlder ? (
                <ActivityIndicator size="small" color="#888" />
              ) : (
                <Text style={styles.olderText} onPress={handleLoadOlder}>
                  Load earlier messages
                </Text>
              )}
            </View>
          ) : null
        }
        onMomentumScrollEnd={(e) => {
          // Near top → load older.
          if (e.nativeEvent.contentOffset.y < 40 && hasMore && !loadingOlder) {
            handleLoadOlder();
          }
        }}
      />
      {pendingList.map((m) => (
        <RetryBubble
          key={m.id}
          message={m}
          onRetry={() => retryMessage(m.id, currentConversation?.matchId ?? '')}
          onDismiss={() =>
            useChatStore.setState((s) => {
              const { [m.id]: _r, ...rest } = s.pendingMessages;
              return { pendingMessages: rest };
            })
          }
        />
      ))}
      <MessageInput onSend={handleSend} onTyping={handleTyping} />

      <ReportModal
        visible={reportMessage !== null}
        target="message"
        targetId={reportMessage?.id ?? ''}
        onClose={() => setReportMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  list: {
    paddingVertical: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34c759',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 16,
    marginTop: -2,
    gap: 4,
  },
  older: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  olderText: {
    color: '#3b82f6',
    fontSize: 13,
  },
});
