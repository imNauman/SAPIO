import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Image } from 'expo-image';
import { usePhotoStore } from '../store/photoStore';
import { Button } from '../components/Button';
import { PrimaryPhotoBadge } from '../components/PrimaryPhotoBadge';
import type { PhotoPublic } from '../lib/api/photo.api';

/**
 * Reorder photos screen.
 *
 * Why: Drag-and-drop reordering via `react-native-draggable-flatlist`. The local
 * list is the source of truth during the drag; on "Save" we push the new id
 * order to the store, which calls the backend `reorder` endpoint. Primary badge
 * is shown for context.
 */
export function ReorderPhotosScreen() {
  const navigation = useNavigation();
  const photos = usePhotoStore((s) => s.photos);
  const reorderPhotos = usePhotoStore((s) => s.reorderPhotos);
  const loading = usePhotoStore((s) => s.loading);
  const error = usePhotoStore((s) => s.error);

  const [local, setLocal] = React.useState<PhotoPublic[]>(photos);

  React.useEffect(() => {
    setLocal(photos);
  }, [photos]);

  const handleSave = async () => {
    try {
      await reorderPhotos(local.map((p) => p.id));
      navigation.goBack();
    } catch {
      // error surfaced via store
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reorder photos</Text>
      <Text style={styles.hint}>Drag to change the display order.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <DraggableFlatList
        data={local}
        onDragEnd={({ data }) => setLocal(data)}
        keyExtractor={(item) => item.id}
        renderItem={({ item, drag }) => (
          <View style={styles.row}>
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {item.isPrimary ? <PrimaryPhotoBadge /> : null}
            <Text style={styles.dragHandle} onPressIn={drag}>
              ⠿ Drag
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      <Button
        title="Save order"
        onPress={handleSave}
        loading={loading}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  hint: { fontSize: 14, color: '#6b7280', marginVertical: 8 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 8 },
  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#e5e7eb' },
  dragHandle: { marginLeft: 'auto', color: '#6b7280', fontSize: 16, padding: 8 },
  btn: { marginTop: 8 },
});
