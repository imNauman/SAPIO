import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * EmptyChatScreen — friendly empty state for the chat list.
 *
 * Why: Shown when the user has no conversations yet. Messaging requires a match,
 * so this nudges them to keep swiping. Pure UI.
 */
export function EmptyChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.title}>No conversations yet</Text>
      <Text style={styles.subtitle}>
        Once you match with someone, your chats will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },
});
