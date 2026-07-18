import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

/**
 * Splash screen.
 *
 * Why: Acts as the initial route. It triggers `bootstrap()` to restore any
 * persisted Supabase session and then lets the navigator decide where to send
 * the user based on `isAuthenticated`/`loading`.
 */
export function SplashScreen() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>SAPIO</Text>
      </View>
      <Text style={styles.tagline}>Find your spark.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 22, fontWeight: '800', color: '#2563eb' },
  tagline: { marginTop: 20, color: '#fff', fontSize: 18, fontWeight: '600' },
});
