import 'dotenv/config';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator, AppStackParamList } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import {
  navigationRef,
  registerForPushNotifications,
  setupNotificationListeners,
} from './lib/fcm';

/**
 * Application entry point.
 *
 * Why: Wraps the navigator in `NavigationContainer` (required by React
 * Navigation) and `SafeAreaProvider` (handles notches/insets). The auth store
 * is bootstrapped from `SplashScreen`, which restores any persisted Supabase
 * session and gates navigation between the Auth and App stacks. The outermost
 * `GestureHandlerRootView` is required by `react-native-gesture-handler` so the
 * swipe deck's `PanGestureHandler` works on native.
 *
 * Push bootstrap: we register the device token with the backend and wire
 * foreground/tap listeners once the navigator is ready. Delivery is event-driven
 * on the backend; this only handles the device side (token + routing).
 */
export default function App() {
  React.useEffect(() => {
    const cleanup = setupNotificationListeners();
    registerForPushNotifications().catch(() => {
      // Non-fatal: the app works without push; the inbox still functions.
    });
    return cleanup;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer<AppStackParamList>
          ref={(ref) => {
            navigationRef.current = ref;
          }}
        >
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
          <OfflineBanner />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
