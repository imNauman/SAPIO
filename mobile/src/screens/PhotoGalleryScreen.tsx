import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePhotoStore } from '../store/photoStore';
import { PhotoGallery } from '../components/PhotoGallery';
import { Button } from '../components/Button';
import { pickAndProcessImage } from '../lib/image';

/**
 * Photo gallery screen.
 *
 * Why: Hosts the reusable `PhotoGallery` and wires the "Add photo" action to the
 * image picker + upload flow. On mount it refreshes the gallery. This is the
 * entry point for managing photos from the profile.
 */
export function PhotoGalleryScreen() {
  const navigation = useNavigation();
  const refreshPhotos = usePhotoStore((s) => s.refreshPhotos);
  const uploading = usePhotoStore((s) => s.uploading);
  const uploadProgress = usePhotoStore((s) => s.uploadProgress);
  const error = usePhotoStore((s) => s.error);
  const uploadPhoto = usePhotoStore((s) => s.uploadPhoto);

  React.useEffect(() => {
    refreshPhotos();
  }, [refreshPhotos]);

  const handleUpload = async () => {
    try {
      const image = await pickAndProcessImage({ source: 'library' });
      if (!image) return; // user cancelled
      await uploadPhoto(image.uri);
    } catch (e) {
      // error surfaced via store
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My photos</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uploading ? (
        <Text style={styles.progress}>
          Uploading… {Math.round(uploadProgress * 100)}%
        </Text>
      ) : null}
      <PhotoGallery
        onUpload={handleUpload}
        onReorder={() => navigation.navigate('ReorderPhotos' as never)}
      />
      {uploading ? (
        <Button title="Uploading…" loading onPress={() => {}} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 8 },
  progress: { color: '#2563eb', fontSize: 14, marginBottom: 8 },
  btn: { marginTop: 12 },
});
