import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePhotoStore } from '../store/photoStore';
import { Button } from '../components/Button';
import { pickAndProcessImage } from '../lib/image';

/**
 * Upload photo screen.
 *
 * Why: Dedicated flow for picking + compressing + uploading a single photo.
 * Reuses the shared image helper and the photo store's `uploadPhoto` (which
 * reports progress). Shows loading/progress/error states and a duplicate guard.
 */
export function UploadPhotoScreen() {
  const navigation = useNavigation();
  const uploadPhoto = usePhotoStore((s) => s.uploadPhoto);
  const uploading = usePhotoStore((s) => s.uploading);
  const uploadProgress = usePhotoStore((s) => s.uploadProgress);
  const error = usePhotoStore((s) => s.error);
  const photos = usePhotoStore((s) => s.photos);

  const atLimit = photos.length >= 9;

  const handlePick = async (source: 'library' | 'camera') => {
    try {
      const image = await pickAndProcessImage({ source });
      if (!image) return; // user cancelled
      await uploadPhoto(image.uri);
      navigation.goBack();
    } catch (e) {
      // error surfaced via store
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add a photo</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uploading ? (
        <Text style={styles.progress}>
          Uploading… {Math.round(uploadProgress * 100)}%
        </Text>
      ) : null}

      <Button
        title="Choose from library"
        onPress={() => handlePick('library')}
        loading={uploading}
        disabled={atLimit}
        style={styles.btn}
      />
      <Button
        title="Take a photo"
        variant="secondary"
        onPress={() => handlePick('camera')}
        loading={uploading}
        disabled={atLimit}
        style={styles.btn}
      />
      {atLimit ? (
        <Text style={styles.limit}>You&apos;ve reached the 9-photo limit.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 24 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 8 },
  progress: { color: '#2563eb', fontSize: 14, marginBottom: 8 },
  btn: { marginTop: 12 },
  limit: { color: '#9ca3af', fontSize: 13, marginTop: 12 },
});
