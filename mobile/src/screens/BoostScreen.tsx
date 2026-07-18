import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBoostStore } from '../store/boostStore';
import { Button } from '../components/Button';
import { BoostCountdown } from '../components/BoostCountdown';

/**
 * BoostScreen — the Boost hub.
 *
 * Why: Lets the caller start a Boost (server enforces the `boost` feature gate)
 * and shows the active boost countdown. When a boost is active the start button
 * is hidden and the countdown is shown; when it expires the screen refreshes.
 * All state lives in `boostStore`; this screen is presentational.
 */
export function BoostScreen() {
  const boost = useBoostStore((s) => s.boost);
  const loading = useBoostStore((s) => s.loading);
  const error = useBoostStore((s) => s.error);
  const refresh = useBoostStore((s) => s.refresh);
  const start = useBoostStore((s) => s.start);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isActive = !!boost && new Date(boost.expiresAt).getTime() > Date.now();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Boost</Text>
      <Text style={styles.subtitle}>
        Get up to 2x more profile views for 30 minutes.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isActive && boost ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>Your boost is live</Text>
          <BoostCountdown
            expiresAt={boost.expiresAt}
            onExpired={() => void refresh()}
          />
          <Text style={styles.multiplier}>
            Multiplier: {boost.boostMultiplier}x
          </Text>
        </View>
      ) : (
        <Button
          title={loading ? 'Starting…' : 'Start Boost'}
          loading={loading}
          onPress={() => void start()}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 20,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
  activeCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
  },
  multiplier: {
    marginTop: 8,
    fontSize: 14,
    color: '#92400e',
  },
});
