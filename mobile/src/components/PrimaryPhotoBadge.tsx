import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Small badge marking the primary photo.
 *
 * Why: Reused in the grid and preview to make the "primary" concept obvious
 * without repeating styling.
 */
export function PrimaryPhotoBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Primary</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
