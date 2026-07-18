import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Image utilities for the photo module.
 *
 * Why: Centralizes the platform-specific image work (pick + compress/resize)
 * so screens stay declarative. Compression prevents oversized uploads and
 * speeds up transfers; resizing large images keeps storage/thumbnails sane.
 */

const MAX_DIMENSION = 1080; // px — large enough for a profile photo
const COMPRESS_QUALITY = 0.8; // 0..1 JPEG quality

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Prompt the user to pick an image from the library (or camera), then compress
 * and resize it. Returns the processed local URI, or null if cancelled.
 */
export async function pickAndProcessImage(
  options: { source?: 'library' | 'camera' } = {},
): Promise<PickedImage | null> {
  const source = options.source ?? 'library';

  // Request permission (camera roll / camera).
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required');
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission is required');
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
          allowsEditing: true,
          aspect: [1, 1],
        });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  return {
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
  };
}
