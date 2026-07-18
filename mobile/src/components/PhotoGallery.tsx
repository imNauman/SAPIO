import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePhotoStore } from '../store/photoStore';
import { PhotoGrid } from './PhotoGrid';
import { Button } from './Button';
import type { PhotoPublic } from '../lib/api/photo.api';

/**
 * Photo gallery container.
 *
 * Why: Connects the photo store to the presentational `PhotoGrid`. Handles
 * loading / empty / error states and exposes upload + management actions. The
 * upload screen and reorder screen reuse this; the parent decides which
 * actions are enabled via props.
 */
interface PhotoGalleryProps {
  onUpload?: () => void;
  onReorder?: () => void;
  showManageActions?: boolean;
  maxPhotos?: number;
}

export function PhotoGallery({
  onUpload,
  onReorder,
  showManageActions = true,
  maxPhotos = 9,
}: PhotoGalleryProps) {
  const photos = usePhotoStore((s) => s.photos);
  const loading = usePhotoStore((s) => s.loading);
  const error = usePhotoStore((s) => s.error);
  const setPrimaryPhoto = usePhotoStore((s) => s.setPrimaryPhoto);
  const deletePhoto = usePhotoStore((s) => s.deletePhoto);

  const atLimit = photos.length >= maxPhotos;

  const handleSetPrimary = async (photo: PhotoPublic) => {
    try {
      await setPrimaryPhoto(photo.id);
    } catch {
      /* error surfaced via store */
    }
  };

  const handleDelete = async (photo: PhotoPublic) => {
    try {
      await deletePhoto(photo.id);
    } catch {
      /* error surfaced via store */
    }
  };

  if (loading && photos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading photos…</Text>
      </View>
    );
  }

  if (error && photos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No photos yet.</Text>
        {onUpload ? (
          <Button
            title="Add your first photo"
            onPress={onUpload}
            style={styles.action}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PhotoGrid
        photos={photos}
        onSetPrimary={showManageActions ? handleSetPrimary : undefined}
        onDelete={showManageActions ? handleDelete : undefined}
      />
      <View style={styles.actions}>
        {onUpload && !atLimit ? (
          <Button title="Add photo" onPress={onUpload} style={styles.action} />
        ) : null}
        {onReorder && photos.length > 1 ? (
          <Button
            title="Reorder"
            variant="secondary"
            onPress={onReorder}
            style={styles.action}
          />
        ) : null}
      </View>
      {atLimit ? (
        <Text style={styles.limit}>You&apos;ve reached the 9-photo limit.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  muted: { fontSize: 16, color: '#6b7280', marginBottom: 12 },
  error: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  action: { flex: 1, marginHorizontal: 4 },
  limit: { textAlign: 'center', color: '#9ca3af', marginTop: 8, fontSize: 13 },
});
