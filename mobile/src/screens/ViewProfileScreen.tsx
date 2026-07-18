import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useProfileStore } from '../store/profileStore';
import { useBlockStore } from '../store/blockStore';
import { profileApi, Profile } from '../lib/api/profile.api';
import { photoApi, PhotoPublic } from '../lib/api/photo.api';
import { Button } from '../components/Button';
import { BlockConfirmationModal } from '../components/BlockConfirmationModal';
import { ReportModal } from '../components/ReportModal';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { VerifiedBadge } from '../components/VerifiedBadge';

/**
 * View profile screen.
 *
 * Why: Read-only display of a profile. With no `userId` param it shows the
 * current user's own profile (the authenticated landing screen). With a
 * `userId` param it shows another user's profile and exposes a Block button —
 * the entry point for the blocking system from discovery/swipe. Blocking is
 * immediate: on success we refresh the swipe deck, matches, and chats so the
 * blocked user disappears from every surface.
 */
type ViewProfileRoute = RouteProp<{ ViewProfile: { userId?: string } }, 'ViewProfile'>;

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  non_binary: 'Non-binary',
  other: 'Other',
};
const GOAL_LABELS: Record<string, string> = {
  casual: 'Casual',
  dating: 'Dating',
  serious: 'Serious',
  friendship: 'Friendship',
  marriage: 'Marriage',
};

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ViewProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<ViewProfileRoute>();
  const viewingUserId = route.params?.userId;

  const ownProfile = useProfileStore((s) => s.profile);
  const loadingOwn = useProfileStore((s) => s.loading);
  const errorOwn = useProfileStore((s) => s.error);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [other, setOther] = React.useState<Profile | null>(null);
  const [loadingOther, setLoadingOther] = React.useState(false);
  const [errorOther, setErrorOther] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<PhotoPublic[]>([]);
  const [previewPhoto, setPreviewPhoto] = React.useState<PhotoPublic | null>(null);

  const blockUser = useBlockStore((s) => s.blockUser);
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [blocking, setBlocking] = React.useState(false);
  const [reportVisible, setReportVisible] = React.useState(false);
  const [reportPhotoId, setReportPhotoId] = React.useState<string | null>(null);

  const isOwn = !viewingUserId;

  React.useEffect(() => {
    if (isOwn) {
      if (!ownProfile) fetchProfile();
      return;
    }
    let active = true;
    setLoadingOther(true);
    setErrorOther(null);
    Promise.all([
      profileApi.getById(viewingUserId),
      photoApi.getByUser(viewingUserId),
    ])
      .then(([p, ph]) => {
        if (!active) return;
        setOther(p);
        setPhotos(ph);
      })
      .catch((e) =>
        active &&
        setErrorOther(e instanceof Error ? e.message : 'Failed to load profile'),
      )
      .finally(() => active && setLoadingOther(false));
    return () => {
      active = false;
    };
  }, [isOwn, viewingUserId, ownProfile, fetchProfile]);

  const profile = isOwn ? ownProfile : other;
  const loading = isOwn ? loadingOwn : loadingOther;
  const error = isOwn ? errorOwn : errorOther;

  const handleBlock = async (reason?: string) => {
    if (!viewingUserId) return;
    setBlocking(true);
    try {
      await blockUser(viewingUserId, reason);
      setConfirmVisible(false);
      // Immediately remove the blocked user from every surface.
      const { useSwipeStore } = await import('../store/swipeStore');
      const { useMatchStore } = await import('../store/matchStore');
      const { useChatStore } = await import('../store/chatStore');
      useSwipeStore.getState().refreshDeck();
      useMatchStore.getState().fetchMatches();
      useChatStore.getState().refreshChats();
      navigation.goBack();
    } catch (e) {
      setErrorOther(e instanceof Error ? e.message : 'Failed to block user');
    } finally {
      setBlocking(false);
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button
          title="Retry"
          onPress={() => (isOwn ? fetchProfile() : navigation.goBack())}
          style={styles.retry}
        />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No profile yet.</Text>
        {isOwn ? (
          <Button
            title="Create profile"
            onPress={() => navigation.navigate('CreateProfile' as never)}
            style={styles.retry}
          />
        ) : (
          <Button
            title="Back"
            onPress={() => navigation.goBack()}
            style={styles.retry}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>
          {profile.displayName || profile.username || 'Profile'}
        </Text>
        <VerifiedBadge verified={profile.isVerified} size="medium" />
      </View>
      {profile.username ? (
        <Text style={styles.handle}>@{profile.username}</Text>
      ) : null}

      <Row label="Bio" value={profile.bio} />
      <Row
        label="Gender"
        value={profile.gender ? GENDER_LABELS[profile.gender] : null}
      />
      <Row
        label="Interested in"
        value={
          profile.interestedIn.length
            ? profile.interestedIn.map((g) => GENDER_LABELS[g]).join(', ')
            : null
        }
      />
      <Row
        label="Looking for"
        value={
          profile.relationshipGoal ? GOAL_LABELS[profile.relationshipGoal] : null
        }
      />
      <Row
        label="Height"
        value={profile.heightCm ? `${profile.heightCm} cm` : null}
      />
      <Row label="Occupation" value={profile.occupation} />
      <Row label="Education" value={profile.education} />
      <Row
        label="Location"
        value={
          [profile.city, profile.country].filter(Boolean).join(', ') || null
        }
      />

      {isOwn ? (
        <>
          <Button
            title="Edit profile"
            onPress={() => navigation.navigate('EditProfile' as never)}
            style={styles.editButton}
          />
          <Button
            title="My Photos"
            variant="secondary"
            onPress={() => navigation.navigate('PhotoGallery' as never)}
            style={styles.editButton}
          />
        </>
      ) : (
        <>
          {photos.length > 0 ? (
            <View style={styles.photosSection}>
              <Text style={styles.photosHeading}>Photos</Text>
              <PhotoGrid
                photos={photos}
                onPressPhoto={(p) => setPreviewPhoto(p)}
              />
            </View>
          ) : null}

          <Button
            title="Block User"
            variant="secondary"
            onPress={() => setConfirmVisible(true)}
            style={styles.blockButton}
          />
          <Button
            title="Report User"
            variant="secondary"
            onPress={() => setReportVisible(true)}
            style={styles.reportButton}
          />
        </>
      )}

      <BlockConfirmationModal
        visible={confirmVisible}
        displayName={profile.displayName}
        loading={blocking}
        onConfirm={handleBlock}
        onCancel={() => setConfirmVisible(false)}
      />

      {viewingUserId ? (
        <ReportModal
          visible={reportVisible}
          target="profile"
          targetId={viewingUserId}
          displayName={profile.displayName}
          onClose={() => setReportVisible(false)}
        />
      ) : null}

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={previewPhoto !== null}
        onClose={() => setPreviewPhoto(null)}
        onReport={(p) => {
          setPreviewPhoto(null);
          setReportPhotoId(p.id);
        }}
      />

      {reportPhotoId ? (
        <ReportModal
          visible={reportPhotoId !== null}
          target="photo"
          targetId={reportPhotoId}
          onClose={() => setReportPhotoId(null)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  name: { fontSize: 24, fontWeight: '800', color: '#111827' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  handle: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 2 },
  rowValue: { fontSize: 16, color: '#111827' },
  muted: { fontSize: 16, color: '#6b7280' },
  error: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retry: { marginTop: 12, width: 200 },
  editButton: { marginTop: 24 },
  blockButton: {
    marginTop: 24,
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  reportButton: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  photosSection: { marginTop: 24 },
  photosHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
});
