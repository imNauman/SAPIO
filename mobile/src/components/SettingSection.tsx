import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * A titled grouping of settings rows.
 *
 * Why: The Settings screens repeat the same "section header + rows" layout.
 * This component keeps that consistent and avoids duplicating the styling.
 */
interface SettingSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#8a8a8e',
    marginLeft: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
