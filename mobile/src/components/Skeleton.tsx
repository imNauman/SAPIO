import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';

/**
 * Skeleton — a shimmer placeholder primitive.
 *
 * Why: A lightweight, dependency-free placeholder. Renders a grey rounded box
 * so loading states stay consistent across the app. Used by
 * ConversationSkeleton and other loading screens.
 */
interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 14, radius = 6 }: SkeletonProps) {
  return (
    <View style={[styles.box, { width, height, borderRadius: radius }]} />
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#e0e0e0' },
});
