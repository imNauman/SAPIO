import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '../../lib/api/chat.api';

/**
 * RetryBubble — a failed outgoing message with a retry / dismiss affordance.
 *
 * Why: Presentational + callback. When a send fails, the store keeps the
 * message in `pendingMessages` keyed by a temp id. This component renders the
 * original content (text or image) with a red "!" and a Retry button. The
 * parent wires `onRetry`/`onDismiss` to the store actions.
 */
interface RetryBubbleProps {
  message: Message;
  onRetry: () => void;
  onDismiss: () => void;
}

export function RetryBubble({ message, onRetry, onDismiss }: RetryBubbleProps) {
  return (
    <View style={[styles.row, styles.rowOwn]}>
      <View style={[styles.bubble, styles.bubbleOwn]}>
        {message.messageType === 'image' && message.imageUrl ? (
          <Text style={styles.text}>📷 Photo (failed)</Text>
        ) : (
          <Text style={[styles.text, styles.textOwn]}>{message.text}</Text>
        )}
        <View style={styles.actions}>
          <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#ffd9df',
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  text: { fontSize: 15 },
  textOwn: { color: '#7a1020' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b5c',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dismiss: { color: '#7a1020', fontSize: 12 },
});
