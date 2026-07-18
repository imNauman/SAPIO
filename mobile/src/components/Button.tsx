import React from 'react';
import {
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

/**
 * Reusable button with a loading state.
 *
 * Why: Auth actions are async; a single Button component that shows a spinner
 * while `loading` is true avoids duplicating that logic across screens.
 */
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = loading || disabled;
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDanger ? styles.danger : isSecondary ? styles.secondary : styles.primary,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isDanger || isSecondary ? '#ef4444' : '#fff'} />
      ) : (
        <Text
          style={[
            styles.text,
            isDanger
              ? styles.textDanger
              : isSecondary
                ? styles.textSecondary
                : styles.textPrimary,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: '#2563eb' },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  disabled: { opacity: 0.6 },
  text: { fontSize: 16, fontWeight: '700' },
  textPrimary: { color: '#fff' },
  textSecondary: { color: '#2563eb' },
  textDanger: { color: '#ef4444' },
});
