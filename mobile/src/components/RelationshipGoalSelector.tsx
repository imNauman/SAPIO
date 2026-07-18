import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * RelationshipGoalSelector — single-select chips for the relationship goal.
 *
 * Why: The discovery filter supports a single relationship goal (or "Any").
 * Tapping the active goal clears it (back to null = Any). Reuses the chip
 * pattern already used in RecommendationSettingsScreen.
 */
interface RelationshipGoalSelectorProps<T extends string> {
  value: T | null;
  options: T[];
  onSelect: (goal: T | null) => void;
}

export function RelationshipGoalSelector<T extends string>({
  value,
  options,
  onSelect,
}: RelationshipGoalSelectorProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Relationship goal</Text>
      <View style={styles.chips}>
        {options.map((goal) => {
          const active = value === goal;
          return (
            <TouchableOpacity
              key={goal}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onSelect(active ? null : goal)}
            >
              <Text
                style={[styles.chipText, active ? styles.chipTextActive : null]}
              >
                {goal}
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
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
