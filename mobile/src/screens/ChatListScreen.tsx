import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChatStore } from '../store/chatStore';
import { ConversationCard } from '../components/ConversationCard';
import { EmptyChatScreen } from '../components/EmptyChatScreen';
import { ConversationSkeleton } from '../components/chat/ConversationSkeleton';
import type { AppStackParamList } from '../navigation/RootNavigator';
import type { Conversation } from '../lib/api/chat.api';

type ChatListNav = NativeStackNavigationProp<AppStackParamList, 'ChatList'>;

/**
 * ChatListScreen — the user's conversation list (chat-experience upgrade).
 *
 * Why: Reads `conversations` from `chatStore` (loaded via `refreshChats` on
 * mount). Renders a `ConversationCard` per row with unread badges, online dots,
 * and typing indicators. Shows a skeleton while loading, an empty state when
 * there are no conversations, and a spinner on first load. Tapping a card opens
 * `Conversation` with that conversation's id. Messaging is only possible for
 * active matches, which the backend enforces — the client just renders what it's
 * given.
 */
export function ChatListScreen() {
  const navigation = useNavigation<ChatListNav>();
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loading);
  const refreshChats = useChatStore((s) => s.refreshChats);

  React.useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  const handlePress = React.useCallback(
    (conversation: Conversation) => {
      navigation.navigate('Conversation', {
        conversationId: conversation.id,
      });
    },
    [navigation],
  );

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <ConversationSkeleton count={6} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyChatScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item: Conversation) => item.id}
        renderItem={({ item }) => (
          <ConversationCard conversation={item} onPress={handlePress} />
        )}
        contentContainerStyle={styles.list}
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
    paddingVertical: 8,
  },
});
