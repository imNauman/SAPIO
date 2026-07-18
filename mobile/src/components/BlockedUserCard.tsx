import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { BlockedUser } from '../lib/api/block.api';

/**
 * BlockedUserCard — one row in the blocked-users list.
 *
 * Why: Shows the blocked user's avatar/name and an Unblock action. Unblocking
 * is delegated to the block store; the parent list re-renders from store state.
 */
interface BlockedUserCardProps {
  user: BlockedUser;
  onUnblock: (userId: string) => void;
}

export function BlockedUserCard({ user, onUnblock }: BlockedUserCardProps) {
  const name = user.displayName || user.username || 'Unknown';
  return (
    <View style={styles.card}>
      {user.primaryPhotoUrl ? (
        <ExpoImage
          source={{ uri: user.primaryPhotoUrl }}
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {user.reason ? (
          <Text style={styles.reason}>Reason: {user.reason}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.unblock}
        onPress={() => onUnblock(user.blockedUserId)}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#6b7280' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  reason: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  unblockText: { color: '#374151', fontWeight: '700' },
});
