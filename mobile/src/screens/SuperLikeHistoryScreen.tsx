import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSuperLikeStore } from '../store/superLikeStore';
import { SuperLikeButton } from '../components/SuperLikeButton';

/**
 * SuperLikeHistoryScreen — the Super Like hub.
 *
 * Why: Shows the caller's remaining Super Like count (resolved server-side from
 * subscription features), a `SuperLikeButton` to send one (wired to the store),
 * and the list of users who Super Liked the caller (the "who liked you"
 * surface). The feature gate + daily limit are enforced server-side; this
 * screen only reflects state from `superLikeStore`.
 */
export function SuperLikeHistoryScreen() {
  const history = useSuperLikeStore((s) => s.history);
  const received = useSuperLikeStore((s) => s.received);
  const usage = useSuperLikeStore((s) => s.usage);
  const loading = useSuperLikeStore((s) => s.loading);
  const error = useSuperLikeStore((s) => s.error);
  const refresh = useSuperLikeStore((s) => s.refresh);
  const send = useSuperLikeStore((s) => s.send);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const remaining = usage?.remaining ?? 0;

  const onRefresh = React.useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Super Likes</Text>
      <Text style={styles.subtitle}>
        {usage
          ? `${remaining} of ${usage.dailyLimit} left today`
          : 'Loading…'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SuperLikeButton
        remaining={remaining}
        loading={loading}
        onPress={() => {
          // Demo target: re-send to the most recent received user if present,
          // otherwise the store action is a no-op placeholder for the deck.
          const target = received[0]?.fromUserId;
          if (target) void send(target);
        }}
      />

      <Text style={styles.section}>Who Super Liked you</Text>
      <FlatList
        data={received}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowText}>User {item.fromUserId.slice(0, 8)}</Text>
            <Text style={styles.rowMeta}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No super likes received yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
    marginBottom: 16,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
  },
  section: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowText: {
    fontSize: 15,
    color: '#111827',
  },
  rowMeta: {
    fontSize: 13,
    color: '#9ca3af',
  },
  empty: {
    color: '#9ca3af',
    marginTop: 12,
  },
});
