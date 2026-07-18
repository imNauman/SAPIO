import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotificationStore } from '../store/notificationStore';
import { NotificationCard } from '../components/NotificationCard';
import { Notification } from '../lib/api/notification.api';
import { AppStackParamList } from '../navigation/RootNavigator';

/**
 * Notification center (inbox).
 *
 * Why: Lists the user's notifications from the backend inbox, supports pull-to-
 * refresh, and marks items read on tap. Tapping also deep-links into the
 * relevant screen using the notification payload (mirrors the push tap routing).
 */
export function NotificationCenterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const notifications = useNotificationStore((s) => s.notifications);
  const loading = useNotificationStore((s) => s.loading);
  const error = useNotificationStore((s) => s.error);
  const refresh = useNotificationStore((s) => s.refreshNotifications);
  const markRead = useNotificationStore((s) => s.markRead);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePress = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    const payload = n.payload ?? undefined;
    switch (n.type) {
      case 'new_match':
        navigation.navigate('Matches' as never);
        break;
      case 'new_message':
        navigation.navigate('Conversation', {
          conversationId: payload?.conversationId,
          matchId: payload?.matchId,
        } as never);
        break;
      case 'verification_approved':
      case 'verification_rejected':
        navigation.navigate('Verification' as never);
        break;
      case 'report_resolved':
        navigation.navigate('MyReports' as never);
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={handlePress} />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  error: { color: '#b91c1c', padding: 12, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
});
