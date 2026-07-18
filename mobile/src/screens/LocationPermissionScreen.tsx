import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { useDiscoveryPreferencesStore } from '../store/discoveryPreferencesStore';

/**
 * LocationPermissionScreen — first-run prompt to enable location.
 *
 * Why: Discovery is distance-based, so we ask for foreground location on first
 * run. The store's `requestLocationPermission` handles the native prompt and
 * pushes coords to the backend. On grant we navigate to the Discovery feed; on
 * denial we let the user continue (last-known / manual location still works).
 */
export function LocationPermissionScreen() {
  const navigation = useNavigation();
  const locating = useDiscoveryPreferencesStore((s) => s.locating);
  const permissionStatus = useDiscoveryPreferencesStore(
    (s) => s.permissionStatus,
  );
  const requestLocationPermission = useDiscoveryPreferencesStore(
    (s) => s.requestLocationPermission,
  );

  const handleEnable = async () => {
    const status = await requestLocationPermission();
    // Either way, proceed to discovery — denial just means less precise radius.
    if (status === 'granted' || status === 'unavailable') {
      navigation.navigate('Discovery' as never);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Discovery' as never);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.title}>Enable location</Text>
        <Text style={styles.body}>
          SAPIO uses your location to show people nearby. You can change this
          anytime in Settings.
        </Text>
        <Button
          title="Enable location"
          loading={locating}
          onPress={handleEnable}
          style={styles.primary}
        />
        <Button
          title="Not now"
          variant="secondary"
          onPress={handleSkip}
          style={styles.secondary}
        />
        {permissionStatus === 'denied' && (
          <Text style={styles.warn}>
            Location permission was denied. You can enable it in your device
            settings, or continue with your last known location.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 12,
  },
  primary: { marginTop: 16, width: '100%' },
  secondary: { marginTop: 10, width: '100%' },
  warn: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 12,
  },
});
