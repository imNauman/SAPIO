import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { PrimaryPhotoBadge } from './PrimaryPhotoBadge';
import type { PhotoPublic } from '../lib/api/photo.api';

/**
 * Full-screen photo preview modal.
 *
 * Why: Lets the user inspect a single photo. Tapping the backdrop closes it.
 * Shows the primary badge when relevant. When `onReport` is provided (i.e. the
 * viewer is looking at another user's photo), a "Report photo" button is shown
 * so abusive photos can be flagged without leaving the preview.
 */
interface PhotoPreviewModalProps {
  photo: PhotoPublic | null;
  visible: boolean;
  onClose: () => void;
  onReport?: (photo: PhotoPublic) => void;
}

export function PhotoPreviewModal({
  photo,
  visible,
  onClose,
  onReport,
}: PhotoPreviewModalProps) {
  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.inner}>
          <Image
            source={{ uri: photo.photoUrl }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
          {photo.isPrimary ? (
            <View style={styles.badgeWrap}>
              <PrimaryPhotoBadge />
            </View>
          ) : null}
          {onReport ? (
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => onReport(photo)}
              activeOpacity={0.8}
            >
              <Text style={styles.reportText}>Report photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: { width: '90%', aspectRatio: 3 / 4, position: 'relative' },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  badgeWrap: { position: 'absolute', top: 12, left: 12 },
  reportBtn: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(220,38,38,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  reportText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
