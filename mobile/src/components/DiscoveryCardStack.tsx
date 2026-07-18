import React from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { DiscoveryCard } from './DiscoveryCard';
import type { DiscoveryProfile } from '../lib/api/discovery.api';

/**
 * DiscoveryCardStack — a vertical, scrollable stack of profile cards.
 *
 * Why: The feed is a plain scrollable list (NOT a swipe deck — swipe gestures
 * are a future milestone). We use `FlatList` for efficient virtualization and
 * infinite loading: when the user nears the end and `hasMore` is true, we call
 * `onLoadMore`. Each card is rendered by `DiscoveryCard`; tapping calls
 * `onPressCard`. Pull-to-refresh is delegated via the `refreshControl` prop.
 */
interface DiscoveryCardStackProps {
  profiles: DiscoveryProfile[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPressCard?: (profile: DiscoveryProfile) => void;
  refreshControl?: React.ReactElement;
}

export function DiscoveryCardStack({
  profiles,
  hasMore,
  loadingMore,
  onLoadMore,
  onPressCard,
  refreshControl,
}: DiscoveryCardStackProps) {
  return (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <DiscoveryCard profile={item} onPress={onPressCard} />
      )}
      contentContainerStyle={styles.list}
      onEndReached={() => {
        if (hasMore && !loadingMore) onLoadMore();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={refreshControl}
      ListFooterComponent={
        hasMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.footerText}>Loading more…</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: { color: '#6b7280', fontSize: 14 },
});
