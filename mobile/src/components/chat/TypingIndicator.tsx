import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * TypingIndicator — three animated dots shown when the counterpart is typing.
 *
 * Why: Presentational only. The parent passes `visible`; we render a small
 * bubble with a spinner + "typing…" label. Keeps the conversation header clean
 * and avoids re-rendering the whole message list.
 */
interface TypingIndicatorProps {
  visible: boolean;
  name?: string | null;
}

export function TypingIndicator({ visible, name }: TypingIndicatorProps) {
  if (!visible) return null;
  return (
    <View style={styles.container} accessibilityLabel="typing indicator">
      <ActivityIndicator size="small" color="#888" style={styles.spinner} />
      <Text style={styles.text}>{name ? `${name} is typing…` : 'typing…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
  },
  spinner: { marginRight: 8 },
  text: { fontSize: 13, color: '#666', fontStyle: 'italic' },
});
