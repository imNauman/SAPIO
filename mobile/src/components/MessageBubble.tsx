import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import type { Message } from '../lib/api/chat.api';

/**
 * MessageBubble — a single chat message.
 *
 * Why: Presentational. Own messages align right with a primary background;
 * counterpart messages align left with a neutral background. Supports text and
 * image messages, a soft-deleted placeholder, an edited marker, and a
 * timestamp. Memoized so list re-renders stay cheap. Pure UI — no business
 * logic. A long-press surfaces the report action (wired by the parent) so users
 * can flag abusive messages without leaving the thread.
 */
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReport?: (message: Message) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubbleImpl({ message, isOwn, onReport }: MessageBubbleProps) {
  const deleted = Boolean(message.deletedAt);
  const showImage = message.messageType === 'image' && message.imageUrl;

  return (
    <TouchableOpacity
      onLongPress={onReport ? () => onReport(message) : undefined}
      delayLongPress={400}
      disabled={!onReport || deleted}
      activeOpacity={0.8}
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
    >
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {deleted ? (
          <Text style={styles.deleted}>Message deleted</Text>
        ) : showImage ? (
          <Image
            source={{ uri: message.imageUrl! }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
            {message.text}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
          {message.editedAt ? <Text style={styles.edited}>edited</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: '#fd5068',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f1f1f4',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textOwn: {
    color: '#fff',
  },
  textOther: {
    color: '#111827',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  deleted: {
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  edited: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
  },
});
