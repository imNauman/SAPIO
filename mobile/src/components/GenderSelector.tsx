import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * GenderSelector — multi-select chips for "show me" gender.
 *
 * Why: The discovery filter's `show_me_gender` is a set of genders the caller
 * wants to see. Empty set = show everyone (no gender hard-filter). Tapping a
 * chip toggles membership. Reuses the chip pattern from the settings screens.
 */
interface GenderSelectorProps<T extends string> {
  value: T[];
  options: T[];
  onToggle: (gender: T) => void;
}

export function GenderSelector<T extends string>({
  value,
  options,
  onToggle,
}: GenderSelectorProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Show me</Text>
      <Text style={styles.hint}>Leave empty to see everyone</Text>
      <View style={styles.chips}>
        {options.map((g) => {
          const active = value.includes(g);
          return (
            <TouchableOpacity
              key={g}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onToggle(g)}
            >
              <Text
                style={[styles.chipText, active ? styles.chipTextActive : null]}
              >
                {g.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  hint: { fontSize: 12, color: '#8a8a8e', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#1c1c1e', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
});
