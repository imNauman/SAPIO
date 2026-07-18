import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * A single settings row: optional icon, label, hint, right-side value/control,
 * and an onPress for navigation rows.
 *
 * Why: Every Settings screen is a list of these rows. Centralizing the row
 * keeps icons, separators, and tap behavior consistent.
 */
interface SettingItemProps {
  label: string;
  hint?: string;
  value?: string;
  icon?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  showChevron?: boolean;
  danger?: boolean;
}

export function SettingItem({
  label,
  hint,
  value,
  icon,
  onPress,
  right,
  showChevron = true,
  danger = false,
}: SettingItemProps) {
  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {icon ? (
        <Ionicons
          name={icon as any}
          size={22}
          color={danger ? '#ef4444' : '#2563eb'}
          style={styles.icon}
        />
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.label, danger ? styles.labelDanger : null]}>
          {label}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {onPress && showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#c7c7cc"
          style={styles.chevron}
        />
      ) : null}
    </Wrapper>
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
  icon: { marginRight: 14 },
  textWrap: { flex: 1 },
  label: { fontSize: 16, color: '#1c1c1e' },
  labelDanger: { color: '#ef4444' },
  hint: { fontSize: 13, color: '#8a8a8e', marginTop: 2 },
  right: { marginRight: 8 },
  value: { fontSize: 15, color: '#8a8a8e', marginRight: 6 },
  chevron: { marginLeft: 4 },
});
