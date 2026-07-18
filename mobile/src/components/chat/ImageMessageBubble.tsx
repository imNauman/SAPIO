import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

/**
 * ImageMessageBubble — a chat bubble that shows an image with a tap-to-zoom
 * affordance.
 *
 * Why: Presentational. Reuses `expo-image` (already a transitive dep used by
 * MessageBubble) for cached, lazy-loaded images. The `onPress` callback lets
 * the parent open a lightbox. Memoized so list scrolling stays smooth. We keep
 * image bubbles visually distinct (square, no text padding) from text bubbles.
 */
interface ImageMessageBubbleProps {
  imageUrl: string;
  isOwn: boolean;
  onPress?: () => void;
}

function ImageMessageBubbleImpl({
  imageUrl,
  isOwn,
  onPress,
}: ImageMessageBubbleProps) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ thumbhash: '' }}
        />
      </TouchableOpacity>
    </View>
  );
}

export const ImageMessageBubble = memo(ImageMessageBubbleImpl);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  image: { width: '100%', height: '100%' },
});
