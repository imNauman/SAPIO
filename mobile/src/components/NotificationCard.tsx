import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Notification } from '../lib/api/notification.api';

/**
 * A single notification row.
 *
 * Why: Renders the title/body, a relative time, and an unread dot. Tapping marks
 * the item read (via the store) and lets the parent deep-link using the payload.
 */
interface Props {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationCard({ notification, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        notification.isRead ? styles.read : styles.unread,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      {!notification.isRead && <View style={styles.dot} />}
      <View style={styles.body}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.text}>{notification.body}</Text>
        <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  unread: { backgroundColor: '#eef2ff' },
  read: { backgroundColor: '#ffffff' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
    marginTop: 6,
    marginRight: 10,
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  text: { fontSize: 14, color: '#374151', marginTop: 2 },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
});
