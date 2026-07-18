import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { DiscoveryProfile } from '../../lib/api/discovery.api';
import { SwipeCard } from './SwipeCard';

/**
 * SwipeDeck — the Tinder-style card stack.
 *
 * Why: Orchestrates the deck from the swipe store. It renders the top card as
 * fully interactive (`SwipeCard`) and the next 1–2 cards behind it, pre-scaled
 * and dimmed to create depth (the "next card scales" effect). When the top card
 * is swiped, the store advances `currentIndex` and this component re-renders
 * with the new top card. Buttons (pass/like) are exposed via `onPass`/`onLike`
 * so a screen can drive programmatic swipes too. Memoized for 60fps.
 */
interface SwipeDeckProps {
  cards: DiscoveryProfile[];
  currentIndex: number;
  onSwipeLeft: (profile: DiscoveryProfile) => void;
  onSwipeRight: (profile: DiscoveryProfile) => void;
  /** Tap the top card to open the full profile (e.g. to block). */
  onTap?: (profile: DiscoveryProfile) => void;
  /** Disable interaction while a swipe is in flight. */
  interactive?: boolean;
}

const VISIBLE_BEHIND = 2; // how many cards to render behind the top one
const SCALE_STEP = 0.05;
const Y_OFFSET = 12;

function SwipeDeckImpl({
  cards,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  interactive = true,
}: SwipeDeckProps) {
  const top = cards[currentIndex];
  if (!top) return null;

  // Cards behind the top one, nearest first.
  const behind = cards
    .slice(currentIndex + 1, currentIndex + 1 + VISIBLE_BEHIND)
    .reverse(); // render farthest first so nearest is on top

  return (
    <View style={styles.deck}>
      {behind.map((profile, i) => (
        <ScaledCard
          key={profile.id}
          profile={profile}
          depth={behind.length - i} // 1 = nearest behind
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
        />
      ))}
      <SwipeCard
        profile={top}
        onSwipeLeft={() => onSwipeLeft(top)}
        onSwipeRight={() => onSwipeRight(top)}
        onTap={onTap ? () => onTap(top) : undefined}
        enabled={interactive}
      />
    </View>
  );
}

/** A non-interactive, pre-scaled card behind the top one (depth effect). */
const ScaledCard = memo(function ScaledCard({
  profile,
  depth,
  onSwipeLeft,
  onSwipeRight,
}: {
  profile: DiscoveryProfile;
  depth: number;
  onSwipeLeft: (p: DiscoveryProfile) => void;
  onSwipeRight: (p: DiscoveryProfile) => void;
}) {
  const scale = useSharedValue(1 - depth * SCALE_STEP);
  const translateY = useSharedValue(depth * Y_OFFSET);
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { damping: 20, stiffness: 200 }) },
      { translateY: withSpring(translateY.value, { damping: 20, stiffness: 200 }) },
    ],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <SwipeCard
        profile={profile}
        onSwipeLeft={() => onSwipeLeft(profile)}
        onSwipeRight={() => onSwipeRight(profile)}
        enabled={false}
      />
    </Animated.View>
  );
});

export const SwipeDeck = memo(SwipeDeckImpl);

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
});
