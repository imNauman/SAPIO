import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

/**
 * A settings row with a toggle on the right.
 *
 * Why: Privacy/notification screens are mostly label + Switch pairs. This
 * component pairs the label with a controlled Switch and a consistent layout.
 */
interface SettingSwitchProps {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}

export function SettingSwitch({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
}: SettingSwitchProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d1d1d6', true: '#2563eb' }}
        ios_backgroundColor="#d1d1d6"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececec',
  },
  textWrap: { flex: 1, marginRight: 12 },
  label: { fontSize: 16, color: '#1c1c1e' },
  hint: { fontSize: 13, color: '#8a8a8e', marginTop: 2 },
});
