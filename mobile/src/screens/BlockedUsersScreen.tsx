import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useBlockStore } from '../store/blockStore';
import { BlockedUserCard } from '../components/BlockedUserCard';

/**
 * BlockedUsersScreen — lists the caller's blocked users.
 *
 * Why: The management surface for the blocking system. Loads the list on mount
 * via the block store and lets the user unblock anyone. Unblocking restores
 * visibility only (old swipes/messages remain, archived chats stay archived).
 */
export function BlockedUsersScreen() {
  const blockedUsers = useBlockStore((s) => s.blockedUsers);
  const loading = useBlockStore((s) => s.loading);
  const error = useBlockStore((s) => s.error);
  const refresh = useBlockStore((s) => s.refreshBlockedUsers);
  const unblockUser = useBlockStore((s) => s.unblockUser);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && blockedUsers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (error && blockedUsers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={() => void refresh()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You haven&apos;t blocked anyone.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={blockedUsers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <BlockedUserCard user={item} onUnblock={unblockUser} />
      )}
      onRefresh={() => void refresh()}
      refreshing={loading}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: { padding: 16, paddingBottom: 40 },
  muted: { fontSize: 16, color: '#6b7280' },
  error: { fontSize: 15, color: '#dc2626', marginBottom: 8 },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '700' },
});
