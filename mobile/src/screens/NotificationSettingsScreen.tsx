import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';

/**
 * Notification preferences screen.
 *
 * Why: Lets the user toggle per-category notification preferences. The toggles
 * are bound to the notification store, which persists them via the backend
 * (and the backend enforces them when dispatching). `pushNotifications` is the
 * master switch for the push channel; `emailNotifications`/`marketing` are
 * placeholders for future channels (no email/marketing is sent today).
 */

interface ToggleRow {
  key: 'newMatch' | 'newMessage' | 'profileLike' | 'verificationUpdates' | 'marketing' | 'emailNotifications' | 'pushNotifications';
  label: string;
  hint: string;
}

const ROWS: ToggleRow[] = [
  { key: 'newMatch', label: 'New matches', hint: 'When someone likes you back' },
  { key: 'newMessage', label: 'New messages', hint: 'When you receive a chat message' },
  { key: 'profileLike', label: 'Profile likes', hint: 'When someone likes your profile' },
  { key: 'verificationUpdates', label: 'Verification updates', hint: 'Approval / rejection of your verification' },
  { key: 'pushNotifications', label: 'Push notifications', hint: 'Master switch for push delivery' },
  { key: 'emailNotifications', label: 'Email notifications', hint: 'Future channel (not yet sent)' },
  { key: 'marketing', label: 'Marketing', hint: 'Promotions (not sent today)' },
];

export function NotificationSettingsScreen() {
  const preferences = useNotificationStore((s) => s.preferences);
  const loading = useNotificationStore((s) => s.loading);
  const error = useNotificationStore((s) => s.error);
  const refresh = useNotificationStore((s) => s.refreshPreferences);
  const update = useNotificationStore((s) => s.updatePreferences);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const onToggle = (key: ToggleRow['key'], value: boolean) => {
    update({ [key]: value });
  };

  return (
    <ScrollView style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ROWS.map((row) => (
        <View style={styles.row} key={row.key}>
          <View style={styles.labelWrap}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.hint}>{row.hint}</Text>
          </View>
          <Switch
            value={preferences ? preferences[row.key] : false}
            disabled={loading || !preferences}
            onValueChange={(v) => onToggle(row.key, v)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { color: '#b91c1c', padding: 12, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  labelWrap: { flex: 1, marginRight: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
