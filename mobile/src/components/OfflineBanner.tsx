import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectivity } from '../hooks/useConnectivity';

/**
 * Offline banner.
 *
 * Why: Production hardening. Renders a small non-blocking banner at the top of
 * the app whenever the device loses connectivity, so users understand why
 * sends/refreshes may fail. Returns null when online.
 */
export function OfflineBanner() {
  const online = useConnectivity();
  if (online) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You're offline — actions will retry.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#b45309',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: { color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '600' },
});
