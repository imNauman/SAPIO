import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

/**
 * EmptyFeedScreen — shown when the feed has no candidates.
 *
 * Why: Gives the user a clear state and a way to retry (pull-to-refresh is also
 * available, but an explicit button is friendlier on an empty screen).
 */
interface EmptyFeedScreenProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export function EmptyFeedScreen({ onRefresh, loading }: EmptyFeedScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>No one new right now</Text>
      <Text style={styles.subtitle}>
        We&apos;re out of profiles to show you. Check back soon or refresh to
        look again.
      </Text>
      {onRefresh ? (
        <Button
          title="Refresh"
          loading={loading}
          onPress={onRefresh}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 12 },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  button: { width: 200 },
});
