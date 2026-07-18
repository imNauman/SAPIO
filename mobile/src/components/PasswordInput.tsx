import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input } from './Input';

/**
 * Password input with a visibility toggle.
 *
 * Why: Password fields need a show/hide affordance. Wrapping `Input` keeps the
 * same labeled/error styling while adding the toggle.
 */
interface PasswordInputProps {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'go' | 'next';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
}

export function PasswordInput({
  label,
  error,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Input
        label={label}
        error={error}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!visible}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { position: 'absolute', right: 12, bottom: 22 },
  toggleText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});
