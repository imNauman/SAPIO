import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { useNotificationStore } from '../store/notificationStore';
import type { AppStackParamList } from '../navigation/RootNavigator';

/**
 * Push notification bootstrap (Expo Notifications, FCM-backed on Android).
 *
 * Why: This is the mobile half of the push platform. Expo Notifications uses
 * Firebase Cloud Messaging under the hood on Android (and APNs on iOS), so we
 * satisfy the "FCM" requirement without native Firebase linking. Responsibilities:
 *  - request permission + obtain the Expo push token,
 *  - register that token with the backend (which stores it in `device_tokens`),
 *  - handle foreground/background/tap so the app can deep-link into the right
 *    screen from a notification payload.
 *
 * The backend is the source of truth for WHAT to send (event-driven). This file
 * only handles the device token + presentation + tap routing.
 */

// A navigation ref lets the notification handlers navigate without props.
export const navigationRef: { current: NavigationContainerRef<AppStackParamList> | null } = {
  current: null,
};

/** Configure how notifications are shown when the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Map a notification payload to a navigation target. */
function routeFromPayload(
  payload: Record<string, unknown> | undefined,
): { screen: keyof AppStackParamList; params?: object } | null {
  if (!payload) return null;
  switch (payload.type) {
    case 'new_match':
      return { screen: 'Matches' };
    case 'new_message':
      return {
        screen: 'Conversation',
        params: {
          conversationId: payload.conversationId,
          matchId: payload.matchId,
        },
      };
    case 'verification_approved':
    case 'verification_rejected':
      return { screen: 'Verification' };
    case 'report_resolved':
      return { screen: 'MyReports' };
    default:
      return { screen: 'Notifications' };
  }
}

/** Request permission and return the Expo push token (or null). */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work in the simulator.
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }
  if (status !== 'granted') {
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync();
  const token = tokenResponse.data;

  // Android channels are required for notifications to appear.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  // Register the token with the backend (idempotent upsert).
  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await useNotificationStore
    .getState()
    .registerDevice({ deviceToken: token, platform });

  return token;
}

/** Wire foreground + tap listeners. Call once at app bootstrap. */
export function setupNotificationListeners(): () => void {
  const onReceived = Notifications.addNotificationReceivedListener(() => {
    // Foreground delivery: refresh the inbox so the badge/center stays fresh.
    useNotificationStore.getState().refreshNotifications();
  });

  const onResponse = Notifications.addNotificationResponseReceivedListener(
    (response: Notifications.NotificationResponse) => {
      const payload = response.notification.request.content.data as Record<
        string,
        unknown
      >;
      const target = routeFromPayload(payload);
      const nav = navigationRef.current;
      if (target && nav?.isReady?.()) {
        nav.navigate(target.screen, target.params);
      }
    },
  );

  // Return a cleanup function.
  return () => {
    onReceived.remove();
    onResponse.remove();
  };
}
