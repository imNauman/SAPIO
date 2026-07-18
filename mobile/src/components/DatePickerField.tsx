import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Date picker field (date of birth).
 *
 * Why: Wraps `@react-native-community/datetimepicker`. On iOS it shows inline;
 * on Android it opens the native spinner dialog. Enforces a max date (18 years
 * ago) via `maximumDate` so the UI prevents under-age selection.
 */
interface DatePickerFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
}: DatePickerFieldProps) {
  const [show, setShow] = React.useState(false);

  const formatted = value
    ? value.toISOString().split('T')[0]
    : 'Select date';

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.button, error ? styles.buttonError : null]}
        onPress={() => setShow(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.value : styles.placeholder}>{formatted}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {show ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_event, selectedDate) => {
            setShow(Platform.OS === 'android' ? false : true);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  button: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  buttonError: { borderColor: '#ef4444' },
  value: { fontSize: 16, color: '#111827' },
  placeholder: { fontSize: 16, color: '#9ca3af' },
  error: { marginTop: 6, color: '#ef4444', fontSize: 13 },
});
