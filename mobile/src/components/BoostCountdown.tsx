import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';

/**
 * Boost countdown badge.
 *
 * Why: Shows the remaining time on the caller's active boost, derived purely
 * from `expiresAt` (no timer state needed in the store). When the boost expires
 * the component renders nothing and calls `onExpired` once so the parent can
 * refresh. Pure presentational component.
 */
interface BoostCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function BoostCountdown({ expiresAt, onExpired }: BoostCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expires = new Date(expiresAt).getTime();
  const remaining = expires - now;

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.();
    }
  }, [remaining, onExpired]);

  if (remaining <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>Boost active · {formatRemaining(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  text: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 14,
  },
});
