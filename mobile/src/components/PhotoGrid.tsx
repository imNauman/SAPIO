import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PrimaryPhotoBadge } from './PrimaryPhotoBadge';
import type { PhotoPublic } from '../lib/api/photo.api';

/**
 * Responsive grid of photos.
 *
 * Why: Reused by the gallery and upload screens. Each cell shows the image,
 * a primary badge, and optional action buttons (set primary / delete). Tapping
 * a cell opens the preview (via `onPressPhoto`). Uses `expo-image` for cached,
 * lazy-loaded thumbnails.
 */
interface PhotoGridProps {
  photos: PhotoPublic[];
  onPressPhoto?: (photo: PhotoPublic) => void;
  onSetPrimary?: (photo: PhotoPublic) => void;
  onDelete?: (photo: PhotoPublic) => void;
  numColumns?: number;
}

const CACHE_POLICY = 'memory-disk';

export function PhotoGrid({
  photos,
  onPressPhoto,
  onSetPrimary,
  onDelete,
  numColumns = 3,
}: PhotoGridProps) {
  return (
    <View style={styles.grid}>
      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[styles.cell, { width: `${100 / numColumns - 2}%` }]}
        >
          <TouchableOpacity
            style={styles.imageWrap}
            onPress={() => onPressPhoto?.(photo)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: photo.photoUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy={CACHE_POLICY}
              placeholder={{ uri: photo.photoUrl }}
              transition={150}
            />
            {photo.isPrimary ? <PrimaryPhotoBadge /> : null}
          </TouchableOpacity>

          {(onSetPrimary || onDelete) && !photo.isPrimary ? (
            <View style={styles.actions}>
              {onSetPrimary ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onSetPrimary(photo)}
                >
                  <Text style={styles.actionText}>Primary</Text>
                </TouchableOpacity>
              ) : null}
              {onDelete ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => onDelete(photo)}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: { marginBottom: 12 },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  image: { width: '100%', height: '100%' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  deleteBtn: { backgroundColor: '#fef2f2' },
  actionText: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  deleteText: { color: '#ef4444' },
});
