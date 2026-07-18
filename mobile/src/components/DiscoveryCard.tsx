import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import type { DiscoveryProfile } from '../lib/api/discovery.api';

/**
 * DiscoveryCard — a single, non-swipeable profile card in the feed.
 *
 * Why: Presentational only. It shows the primary photo plus the key facts a
 * user needs to decide later (name, age, distance, occupation, education, bio
 * preview, and the verification / premium / online signals). No like/dislike
 * buttons — those are a future milestone. Tapping the card calls `onPress`.
 */
interface DiscoveryCardProps {
  profile: DiscoveryProfile;
  onPress?: (profile: DiscoveryProfile) => void;
}

const CACHE_POLICY = 'memory-disk';

function formatDistance(distanceKm: number | null): string {
  if (distanceKm == null) return 'Distance hidden';
  if (distanceKm < 1) return 'Less than 1 km away';
  return `${distanceKm} km away`;
}

export function DiscoveryCard({ profile, onPress }: DiscoveryCardProps) {
  const name = profile.displayName || profile.username || 'Someone';
  const ageLabel = profile.age != null ? `, ${profile.age}` : '';
  const location = [profile.city, profile.country]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(profile)}
      activeOpacity={0.95}
    >
      <View style={styles.photoWrap}>
        <Image
          source={
            profile.primaryPhotoUrl
              ? { uri: profile.primaryPhotoUrl }
              : undefined
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
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>
          {name}
          <Text style={styles.muted}>{ageLabel}</Text>
        </Text>
        <Text style={styles.distance}>{formatDistance(profile.distanceKm)}</Text>

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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  photoWrap: { position: 'relative', width: '100%', height: 360 },
  photo: { width: '100%', height: '100%', backgroundColor: '#e5e7eb' },
  onlineDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
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
  verified: { backgroundColor: '#2563eb' },
  premium: { backgroundColor: '#d97706' },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  muted: { color: '#6b7280', fontWeight: '600' },
  distance: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  line: { fontSize: 15, color: '#374151', marginTop: 4 },
  bio: { fontSize: 14, color: '#4b5563', marginTop: 8, lineHeight: 20 },
});
