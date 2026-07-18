import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';

/**
 * ConversationSkeleton — placeholder rows shown while the conversation list or
 * a thread is loading.
 *
 * Why: Presentational. Gives the user immediate feedback that content is
 * incoming, reducing perceived latency. Renders `count` shimmer rows with a
 * circular avatar placeholder + two text lines, matching the ConversationCard
 * layout so the transition to real data is seamless.
 */
interface ConversationSkeletonProps {
  count?: number;
}

export function ConversationSkeleton({ count = 6 }: ConversationSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={styles.lines}>
            <Skeleton width="70%" height={14} radius={7} />
            <Skeleton width="45%" height={12} radius={6} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  lines: { flex: 1, gap: 8 },
});
