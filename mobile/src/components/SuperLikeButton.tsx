import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Button } from './Button';

/**
 * Super Like button.
 *
 * Why: Encapsulates the Super Like action + its disabled/limit states. When the
 * caller has no remaining super likes (Free or limit reached) the button is
 * disabled and shows the remaining count. The actual send is delegated to the
 * `onPress` handler (the parent wires it to the store). Pure presentational
 * component — it never calls the API directly.
 */
interface SuperLikeButtonProps {
  remaining: number;
  loading?: boolean;
  onPress: () => void;
}

export function SuperLikeButton({
  remaining,
  loading = false,
  onPress,
}: SuperLikeButtonProps) {
  const disabled = loading || remaining <= 0;

  return (
    <TouchableOpacity
      style={[styles.button, disabled ? styles.disabled : null]}
      disabled={disabled}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>
          {remaining > 0 ? `Super Like (${remaining} left)` : 'No Super Likes left'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: '#c4b5fd',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
