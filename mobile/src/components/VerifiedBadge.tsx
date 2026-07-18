import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Verified badge.
 *
 * Why: A small, reusable indicator shown wherever a profile's verified status
 * matters (profile header, discovery cards, match cards, conversation headers).
 * It reads `verified` (driven by `profile.isVerified`, which the backend sets on
 * approval). No face recognition or government-ID logic is implied — it simply
 * reflects the server-managed flag.
 */
interface VerifiedBadgeProps {
  verified: boolean;
  size?: 'small' | 'medium';
}

export function VerifiedBadge({ verified, size = 'small' }: VerifiedBadgeProps) {
  if (!verified) return null;
  return (
    <View style={[styles.badge, size === 'medium' && styles.badgeMedium]}>
      <Text style={[styles.check, size === 'medium' && styles.checkMedium]}>
        ✓
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMedium: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  check: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  checkMedium: {
    fontSize: 14,
  },
});
