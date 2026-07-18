import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Button } from './Button';

/**
 * MessageInput — composer at the bottom of a conversation.
 *
 * Why: Controlled input with a 4000-char cap (mirrors the backend limit) and a
 * Send button. Calls `onSend(text)` and clears on success. Disables while
 * `loading`. Pure UI; the parent owns the send logic via the chat store.
 */
interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: () => void;
  loading?: boolean;
}

const MAX = 4000;

export function MessageInput({ onSend, onTyping, loading }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(v) => {
          setText(v.slice(0, MAX));
          onTyping?.();
        }}
        placeholder="Type a message…"
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={MAX}
        editable={!loading}
      />
      <Button
        title="Send"
        onPress={handleSend}
        loading={loading}
        disabled={!text.trim() || loading}
        style={styles.send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ececf0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f1f4',
    fontSize: 15,
    color: '#111827',
  },
  send: {
    marginLeft: 8,
    borderRadius: 20,
    paddingHorizontal: 18,
  },
});
