import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

/**
 * Single-select dropdown rendered as a button + native picker sheet.
 *
 * Why: React Native has no built-in dropdown; using `@react-native-picker/picker`
 * inside a modal gives a consistent, accessible chooser. Keeps label/error
 * styling aligned with the other form components.
 */
import { Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface DropdownProps<T extends string> {
  label?: string;
  value: T | null;
  onValueChange: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
  error?: string;
}

export function Dropdown<T extends string>({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  error,
}: DropdownProps<T>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.button, error ? styles.buttonError : null]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value
            ? options.find((o) => o.value === value)?.label ?? placeholder
            : placeholder}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Picker
              selectedValue={value}
              onValueChange={(itemValue) => {
                if (itemValue) onValueChange(itemValue as T);
                setVisible(false);
              }}
            >
              <Picker.Item label={placeholder} value={null} />
              {options.map((o) => (
                <Picker.Item key={o.value} label={o.label} value={o.value} />
              ))}
            </Picker>
            <Pressable
              style={styles.doneButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  doneButton: { alignItems: 'flex-end', paddingVertical: 8 },
  doneText: { color: '#2563eb', fontSize: 16, fontWeight: '700' },
});
