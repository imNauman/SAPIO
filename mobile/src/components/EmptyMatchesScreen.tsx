import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * EmptyMatchesScreen — shown when the user has no matches yet.
 *
 * Why: Friendly empty state for the matches list. Encourages the user to keep
 * swiping. Purely presentational.
 */
export function EmptyMatchesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💞</Text>
      <Text style={styles.title}>No matches yet</Text>
      <Text style={styles.subtitle}>
        Keep swiping — when you and someone else both like each other, you&apos;ll
        match here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
