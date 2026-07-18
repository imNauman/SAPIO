import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { TapGestureHandler } from 'react-native-gesture-handler';
import type { DiscoveryProfile } from '../../lib/api/discovery.api';
import { useSwipeGesture, PanGestureHandler } from './useSwipeGesture';
import { SwipeOverlay } from './SwipeOverlay';

const AnimatedCard = Animated.createAnimatedComponent(View);

/**
 * SwipeCard — a single, draggable profile card.
 *
 * Why: Presentational + gesture-wired. It owns one `useSwipeGesture` instance
 * (the physics) and renders the profile content plus the LIKE/NOPE overlay.
 * Memoized so deck advances don't re-render cards that haven't changed. The
 * `onSwipeLeft` / `onSwipeRight` callbacks bubble up to the deck, which advances
 * the store. A tap (no drag) opens the full profile via `onTap`, where the user
 * can block the profile if desired.
 */
interface SwipeCardProps {
  profile: DiscoveryProfile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap?: () => void;
  enabled?: boolean;
}

const CACHE_POLICY = 'memory-disk';

function SwipeCardImpl({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  enabled = true,
}: SwipeCardProps) {
  const gesture = useSwipeGesture({ onSwipeLeft, onSwipeRight, enabled });

  const name = profile.displayName || profile.username || 'Someone';
  const ageLabel = profile.age != null ? `, ${profile.age}` : '';
  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <TapGestureHandler
      enabled={enabled && !!onTap}
      onHandlerStateChange={(e) => {
        if (e.nativeEvent.state === 4 /* ACTIVATED */ && onTap) {
          onTap();
        }
      }}
    >
      <PanGestureHandler
        enabled={enabled}
        onGestureEvent={gesture.onGestureEvent}
      >
        <AnimatedCard style={[styles.card, gesture.animatedStyle]}>
        <View style={styles.photoWrap}>
          <Image
            source={
              profile.primaryPhotoUrl ? { uri: profile.primaryPhotoUrl } : undefined
            }
            style={styles.photo}
            contentFit="cover"
            cachePolicy={CACHE_POLICY}
            transition={150}
          />
          {profile.isOnline ? <View style={styles.onlineDot} /> : null}
          <View style={styles.badgeRow}>
            {profile.isVerified ? (
              <View style={[styles.badge, styles.verified]}>
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            ) : null}
            {profile.isPremium ? (
              <View style={[styles.badge, styles.premium]}>
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            ) : null}
          </View>
          <SwipeOverlay
            likeStyle={gesture.likeBadgeStyle}
            nopeStyle={gesture.nopeBadgeStyle}
          />
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>
            {name}
            <Text style={styles.muted}>{ageLabel}</Text>
          </Text>
          {profile.distanceKm != null ? (
            <Text style={styles.distance}>
              {profile.distanceKm < 1
                ? 'Less than 1 km away'
                : `${profile.distanceKm} km away`}
            </Text>
          ) : null}
          {profile.occupation ? (
            <Text style={styles.line}>{profile.occupation}</Text>
          ) : null}
          {profile.education ? (
            <Text style={styles.line}>{profile.education}</Text>
          ) : null}
          {location ? <Text style={styles.line}>{location}</Text> : null}
          {profile.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </AnimatedCard>
      </PanGestureHandler>
    </TapGestureHandler>
  );
}

export const SwipeCard = memo(SwipeCardImpl);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    margin: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  photoWrap: {
    position: 'relative',
    width: '100%',
    height: 360,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  onlineDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verified: {
    backgroundColor: '#2563eb',
  },
  premium: {
    backgroundColor: '#d97706',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  muted: {
    color: '#6b7280',
    fontWeight: '600',
  },
  distance: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  line: {
    fontSize: 15,
    color: '#374151',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    lineHeight: 20,
  },
});
