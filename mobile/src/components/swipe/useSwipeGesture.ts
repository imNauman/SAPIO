import { useRef } from 'react';
import { Dimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

/**
 * SwipeGesture — the physics/gesture engine for a single card.
 *
 * Why: Isolates all gesture + animation math from the card UI. It builds a
 * reanimated `useAnimatedGestureHandler` bound to a `PanGestureHandler`, exposes
 * shared values for position/rotation/opacity, and an `animatedStyle` for the
 * card. On release it detects velocity + threshold and either snaps back
 * (rubber-band) or fires `onSwipeLeft` / `onSwipeRight` (Tinder-style fling).
 * Keeping this separate means `SwipeCard` stays presentational and `SwipeDeck`
 * just orchestrates.
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28; // distance to commit a swipe
const VELOCITY_THRESHOLD = 800; // px/s fling to commit regardless of distance

export interface SwipeGestureOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** Disable interaction (e.g. while a previous swipe is animating). */
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: SwipeGestureOptions) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const likeOpacity = useSharedValue(0);
  const nopeOpacity = useSharedValue(0);

  // Track the latest callbacks without re-creating the gesture handler.
  const cb = useRef({ onSwipeLeft, onSwipeRight });
  cb.current = { onSwipeLeft, onSwipeRight };

  const onGestureEvent = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>(
    {
      onActive: (e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        // Rotation proportional to horizontal drag (Tinder-like tilt).
        rotate.value = (e.translationX / SCREEN_WIDTH) * (Math.PI / 4);
        const t = Math.min(Math.abs(e.translationX) / SWIPE_THRESHOLD, 1);
        likeOpacity.value = e.translationX > 0 ? t : 0;
        nopeOpacity.value = e.translationX < 0 ? t : 0;
      },
      onEnd: (e) => {
        const passed =
          e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD;
        const liked =
          e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD;

        if (passed || liked) {
          const dir = passed ? -1 : 1;
          const flyOut = dir * (SCREEN_WIDTH * 1.5);
          translateX.value = withTiming(flyOut, { duration: 250 });
          translateY.value = withTiming(e.translationY, { duration: 250 });
          cardOpacity.value = withTiming(0, { duration: 250 });
          rotate.value = withTiming(dir * 0.4, { duration: 250 });
          const commit = passed
            ? cb.current.onSwipeLeft
            : cb.current.onSwipeRight;
          runOnJS(commit)();
          return;
        }

        // Rubber-band: spring back to center.
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        rotate.value = withSpring(0, { damping: 18, stiffness: 220 });
        likeOpacity.value = withTiming(0, { duration: 150 });
        nopeOpacity.value = withTiming(0, { duration: 150 });
      },
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}rad` },
    ],
    opacity: cardOpacity.value,
  }));

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: likeOpacity.value,
  }));
  const nopeBadgeStyle = useAnimatedStyle(() => ({
    opacity: nopeOpacity.value,
  }));

  return {
    translateX,
    translateY,
    rotate,
    cardOpacity,
    likeOpacity,
    nopeOpacity,
    animatedStyle,
    likeBadgeStyle,
    nopeBadgeStyle,
    onGestureEvent,
    enabled,
  };
}

export { PanGestureHandler };

