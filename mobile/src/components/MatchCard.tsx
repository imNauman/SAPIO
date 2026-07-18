import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Match } from '../lib/api/match.api';

/**
 * MatchCard — a single row in the matches list.
 *
 * Why: Presentational. Shows the matched user's primary photo, name, and a
 * verified/premium badge. Tapping it is a future milestone (opens the chat /
 * conversation); for now it's a plain row. Memoized so list re-renders stay
 * cheap.
 */
interface MatchCardProps {
  match: Match;
  onPress?: (match: Match) => void;
}

function MatchCardImpl({ match, onPress }: MatchCardProps) {
  const { matchedUser } = match;
  const name = matchedUser.displayName || matchedUser.username || 'Someone';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ? () => onPress(match) : undefined}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <Image
        source={
          matchedUser.primaryPhotoUrl
            ? { uri: matchedUser.primaryPhotoUrl }
            : undefined
        }
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {matchedUser.isVerified ? (
            <View style={[styles.badge, styles.verified]}>
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          ) : null}
          {matchedUser.isPremium ? (
            <View style={[styles.badge, styles.premium]}>
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle}>You matched</Text>
      </View>
    </TouchableOpacity>
  );
}

export const MatchCard = memo(MatchCardImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
  },
  body: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verified: {
    backgroundColor: '#2563eb',
  },
  premium: {
    backgroundColor: '#d97706',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
