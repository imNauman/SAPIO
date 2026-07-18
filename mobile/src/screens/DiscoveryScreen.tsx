import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSwipeStore } from '../store/swipeStore';
import { SwipeDeck } from '../components/swipe/SwipeDeck';
import { LoadingFeedScreen } from '../components/LoadingFeedScreen';
import { EmptyFeedScreen } from '../components/EmptyFeedScreen';
import type { AppStackParamList } from '../navigation/RootNavigator';
import type { DiscoveryProfile } from '../lib/api/discovery.api';

type DiscoveryNav = NativeStackNavigationProp<AppStackParamList, 'Discovery'>;

/**
 * DiscoveryScreen — the Tinder-style swipe feed container.
 *
 * Why: Orchestrates the swipe store with the UI. On mount it loads the deck;
 * pull-to-refresh calls `refreshDeck`; the `SwipeDeck` handles gestures and
 * advances the store on each swipe. When the deck nears the end we call
 * `loadMore` to append the next page (infinite deck). Shows loading / empty
 * states. Tapping a card opens the full profile (where the user can block).
 */
export function DiscoveryScreen() {
  const navigation = useNavigation<DiscoveryNav>();
  const deck = useSwipeStore((s) => s.deck);
  const currentIndex = useSwipeStore((s) => s.currentIndex);
  const loading = useSwipeStore((s) => s.loading);
  const refreshing = useSwipeStore((s) => s.refreshing);
  const error = useSwipeStore((s) => s.error);
  const hasMore = useSwipeStore((s) => s.hasMore);
  const loadDeck = useSwipeStore((s) => s.loadDeck);
  const refreshDeck = useSwipeStore((s) => s.refreshDeck);
  const loadMore = useSwipeStore((s) => s.loadMore);
  const swipeLeft = useSwipeStore((s) => s.swipeLeft);
  const swipeRight = useSwipeStore((s) => s.swipeRight);

  React.useEffect(() => {
    if (deck.length === 0 && !loading) {
      void loadDeck();
    }
  }, [deck.length, loading, loadDeck]);

  const handleTap = React.useCallback(
    (profile: DiscoveryProfile) => {
      navigation.navigate('ViewProfile', { userId: profile.userId });
    },
    [navigation],
  );

  const handleSwipeLeft = React.useCallback(
    async (profile: DiscoveryProfile) => {
      await swipeLeft(profile);
      // Pre-fetch the next page when we're close to the end of the deck.
      const remaining = deck.length - currentIndex - 1;
      if (remaining <= 3 && hasMore) void loadMore();
    },
    [swipeLeft, deck.length, currentIndex, hasMore, loadMore],
  );

  const handleSwipeRight = React.useCallback(
    async (profile: DiscoveryProfile) => {
      await swipeRight(profile);
      const remaining = deck.length - currentIndex - 1;
      if (remaining <= 3 && hasMore) void loadMore();
    },
    [swipeRight, deck.length, currentIndex, hasMore, loadMore],
  );

  if (loading && deck.length === 0) {
    return <LoadingFeedScreen />;
  }

  if (!loading && deck.length === 0) {
    return (
      <EmptyFeedScreen
        onRefresh={() => void refreshDeck()}
        loading={refreshing}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SwipeDeck
        cards={deck}
        currentIndex={currentIndex}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onTap={handleTap}
      />
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void refreshDeck()}
        tintColor="#2563eb"
      />
      {error ? <EmptyFeedScreen onRefresh={() => void refreshDeck()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
});
