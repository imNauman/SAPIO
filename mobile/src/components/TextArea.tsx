import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

/**
 * Multi-line text input with a live character counter and error display.
 *
 * Why: The bio field needs a max-length counter; centralizing it keeps the
 * counter/error styling consistent with `Input`.
 */
interface TextAreaProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  numberOfLines?: number;
}

export function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  maxLength,
  numberOfLines = 4,
}: TextAreaProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {maxLength ? (
            <Text style={styles.counter}>
              {value.length}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          { height: numberOfLines * 24 + 24 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  counter: { fontSize: 12, color: '#9ca3af' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ef4444' },
  error: { marginTop: 6, color: '#ef4444', fontSize: 13 },
});
