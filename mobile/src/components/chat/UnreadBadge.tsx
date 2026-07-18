import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * UnreadBadge — a small circular count badge for unread messages.
 *
 * Why: Presentational. Renders nothing when `count` is 0 (or below 1) so the
 * conversation list stays clean. Caps the label at 99+ for very active threads.
 */
interface UnreadBadgeProps {
  count: number;
}

export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (!count || count < 1) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge} accessibilityLabel={`${count} unread`}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff3b5c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
