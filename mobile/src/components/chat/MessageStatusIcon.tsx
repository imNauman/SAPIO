import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageStatus } from '../../lib/api/chat.api';

/**
 * MessageStatusIcon — shows the delivery/read state of an outgoing message.
 *
 * Why: Presentational. Maps the server `status` to an icon + short label:
 *   sent → single check, delivered → double check, read → double check (blue).
 * We only render for the sender's own messages; counterpart messages have no
 * status affordance. Keeps the read-receipt logic out of the bubble itself.
 */
interface MessageStatusIconProps {
  status: MessageStatus;
}

export function MessageStatusIcon({ status }: MessageStatusIconProps) {
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={14} color="#9aa0a6" />;
  }
  if (status === 'delivered') {
    return <Ionicons name="checkmark-done" size={14} color="#9aa0a6" />;
  }
  // read
  return <Ionicons name="checkmark-done" size={14} color="#3b82f6" />;
}

export function MessageStatusLabel({ status }: MessageStatusIconProps) {
  const text =
    status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent';
  const color = status === 'read' ? '#3b82f6' : '#9aa0a6';
  return <Text style={[styles.label, { color }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 11, marginTop: 2 },
});
