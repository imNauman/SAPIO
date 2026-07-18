import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { MatchedUserProfile as MatchedUser } from '../lib/api/shared';
import { useProfileStore } from '../store/profileStore';
import { Button } from './Button';

/**
 * ItsAMatchModal — the celebratory "It's a Match!" overlay.
 *
 * Why: Shown the moment a mutual LIKE is detected in the swipe flow. Displays
 * the current user's photo and the matched user's photo side by side, the
 * matched user's name, and two actions. "Send Message" is intentionally
 * DISABLED for now (chat is a future milestone) — only the UI exists. Pure
 * presentation; all state lives in `matchStore.newMatch`.
 */
interface ItsAMatchModalProps {
  visible: boolean;
  matchedUser: MatchedUser | null;
  onKeepSwiping: () => void;
  onSendMessage: () => void;
}

function initials(name: string | null, fallback: string): string {
  const base = (name ?? fallback).trim();
  if (!base) return '?';
  return base
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ItsAMatchModal({
  visible,
  matchedUser,
  onKeepSwiping,
  onSendMessage,
}: ItsAMatchModalProps) {
  const profile = useProfileStore((s) => s.profile);
  const currentName = profile?.displayName || profile?.username || 'You';
  const currentPhoto = (profile as { primaryPhotoUrl?: string | null })
    ?.primaryPhotoUrl;
  const matchedName =
    matchedUser?.displayName || matchedUser?.username || 'Someone';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>It&apos;s a Match!</Text>
          <Text style={styles.subtitle}>
            You and {matchedName} have liked each other.
          </Text>

          <View style={styles.photos}>
            <View style={styles.photoWrap}>
              {currentPhoto ? (
                <Image
                  source={{ uri: currentPhoto }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.photo, styles.photoFallback]}>
                  <Text style={styles.photoInitials}>
                    {initials(currentName, 'Y')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.heart}>💞</Text>
            <View style={styles.photoWrap}>
              {matchedUser?.primaryPhotoUrl ? (
                <Image
                  source={{ uri: matchedUser.primaryPhotoUrl }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.photo, styles.photoFallback]}>
                  <Text style={styles.photoInitials}>
                    {initials(matchedName, '?')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Send Message"
              onPress={onSendMessage}
              style={styles.button}
            />
            <Button
              title="Keep Swiping"
              variant="secondary"
              onPress={onKeepSwiping}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#db2777',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  photos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  photoWrap: {
    width: 110,
    height: 110,
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#e5e7eb',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbcfe8',
  },
  photoInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#db2777',
  },
  heart: {
    fontSize: 28,
    marginHorizontal: 12,
  },
  actions: {
    width: '100%',
  },
  button: {
    marginTop: 10,
  },
});
