import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { useDiscoveryPreferencesStore } from '../store/discoveryPreferencesStore';

/**
 * LocationUnavailableScreen — shown when GPS is disabled / no signal.
 *
 * Why: Graceful fallback when `requestLocationPermission` reports `unavailable`
 * (GPS off, airplane mode, no network). We explain the situation and offer to
 * retry or continue with the last known location. The backend still works with
 * the last known coordinates, so discovery is never fully blocked.
 */
export function LocationUnavailableScreen() {
  const navigation = useNavigation();
  const locating = useDiscoveryPreferencesStore((s) => s.locating);
  const requestLocationPermission = useDiscoveryPreferencesStore(
    (s) => s.requestLocationPermission,
  );

  const handleRetry = async () => {
    const status = await requestLocationPermission();
    if (status === 'granted' || status === 'unavailable') {
      navigation.navigate('Discovery' as never);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Discovery' as never);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🛰️</Text>
        <Text style={styles.title}>Location unavailable</Text>
        <Text style={styles.body}>
          We can't get your current location. Your GPS may be off or you may be
          offline. You can still discover people using your last known location,
          or retry once location services are back.
        </Text>
        <Button
          title="Retry"
          loading={locating}
          onPress={handleRetry}
          style={styles.primary}
        />
        <Button
          title="Continue with last location"
          variant="secondary"
          onPress={handleContinue}
          style={styles.secondary}
        />
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
});
