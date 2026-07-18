import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Conversation } from '../lib/api/chat.api';
import { UnreadBadge } from './chat/UnreadBadge';
import { TypingIndicator } from './chat/TypingIndicator';

/**
 * ConversationCard — a row in the chat list (chat-experience upgrade).
 *
 * Why: Presentational. Shows the counterpart's photo + name, an online dot,
 * the last message preview (or a typing indicator when active), and an unread
 * badge. Mirrors `MatchCard` styling. Memoized. `onPress` is wired by the
 * parent (ChatListScreen) to open the thread.
 */
interface ConversationCardProps {
  conversation: Conversation;
  onPress?: (conversation: Conversation) => void;
}

function ConversationCardImpl({ conversation, onPress }: ConversationCardProps) {
  const { counterpart, lastMessagePreview, unreadCount, isTyping } = conversation;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(conversation)}
      activeOpacity={0.85}
    >
      <View>
        <Image
          source={
            counterpart.primaryPhotoUrl
              ? { uri: counterpart.primaryPhotoUrl }
              : require('../../assets/avatar-placeholder.png')
          }
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {conversation.counterpartOnline ? (
          <View style={styles.onlineDot} />
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {counterpart.displayName || counterpart.username || 'SAPIO user'}
          </Text>
          <UnreadBadge count={unreadCount} />
        </View>
        {isTyping ? (
          <TypingIndicator visible={isTyping} name={counterpart.displayName} />
        ) : (
          <Text style={styles.preview} numberOfLines={1}>
            {lastMessagePreview || 'Say hi 👋'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const ConversationCard = memo(ConversationCardImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f4',
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e5e7eb',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34c759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  preview: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});
