import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * SwipeOverlay — the LIKE / NOPE badges that fade in as the card is dragged.
 *
 * Why: Presentational only. It receives the animated opacity styles from the
 * gesture layer (`likeStyle` / `nopeStyle`) so the badges track the drag in
 * real time. Keeping it separate from `SwipeCard` means the card body stays
 * focused on profile content.
 */
interface SwipeOverlayProps {
  likeStyle: Animated.AnimateStyle<{ opacity: number }>;
  nopeStyle: Animated.AnimateStyle<{ opacity: number }>;
}

export function SwipeOverlay({ likeStyle, nopeStyle }: SwipeOverlayProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.badge, styles.like, likeStyle]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.nope, nopeStyle]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  badge: {
    position: 'absolute',
    top: 32,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 3,
  },
  like: {
    left: 24,
    borderColor: '#22c55e',
    transform: [{ rotate: '-18deg' }],
  },
  nope: {
    right: 24,
    borderColor: '#ef4444',
    transform: [{ rotate: '18deg' }],
  },
  likeText: {
    color: '#22c55e',
    fontSize: 28,
    fontWeight: '900',
  },
  nopeText: {
    color: '#ef4444',
    fontSize: 28,
    fontWeight: '900',
  },
});
