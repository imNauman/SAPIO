import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Multi-select chip group (used for "interested in").
 *
 * Why: Lets a user pick several options from a fixed set with clear visual
 * state. Avoids a heavy modal for small option lists.
 */
interface Option<T extends string> {
  label: string;
  value: T;
}

interface MultiSelectProps<T extends string> {
  label?: string;
  values: T[];
  onValuesChange: (values: T[]) => void;
  options: Option<T>[];
  error?: string;
}

export function MultiSelect<T extends string>({
  label,
  values,
  onValuesChange,
  options,
  error,
}: MultiSelectProps<T>) {
  const toggle = (value: T) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((o) => {
          const selected = values.includes(o.value);
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => toggle(o.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, selected ? styles.chipTextSelected : null]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  error: { marginTop: 6, color: '#ef4444', fontSize: 13 },
});
