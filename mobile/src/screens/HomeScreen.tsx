import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { Button } from '../components/Button';
import { VerifiedBadge } from '../components/VerifiedBadge';

/**
 * Authenticated home screen.
 *
 * Why: Entry point of the app stack once a user is authenticated. It surfaces
 * the signed-in email, a link to the profile, and a logout control. Profile,
 * swipe, chat, and matching are later milestones.
 */
export function HomeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const loading = useAuthStore((s) => s.loading);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const profile = useProfileStore((s) => s.profile);

  React.useEffect(() => {
    if (!profile) fetchProfile();
  }, [profile, fetchProfile]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Welcome to SAPIO</Text>
        {profile?.isVerified ? <VerifiedBadge verified size="medium" /> : null}
      </View>
      <Text style={styles.subtitle}>
        Signed in as {user?.email ?? 'unknown'}
      </Text>
      <Button
        title="Go Premium"
        onPress={() => navigation.navigate('Premium' as never)}
        style={styles.button}
      />
      <Button
        title="Boost"
        onPress={() => navigation.navigate('Boost' as never)}
        style={styles.button}
      />
      <Button
        title="Super Likes"
        onPress={() => navigation.navigate('SuperLikeHistory' as never)}
        style={styles.button}
      />
      <Button
        title="Get Verified"
        onPress={() => navigation.navigate('Verification' as never)}
        style={styles.button}
      />
      <Button
        title="View / Edit Profile"
        onPress={() => navigation.navigate('ViewProfile' as never)}
        style={styles.button}
      />
      <Button
        title="Discover People"
        onPress={() => navigation.navigate('Discovery' as never)}
        style={styles.button}
      />
      <Button
        title="Discovery Settings"
        variant="secondary"
        onPress={() => navigation.navigate('DiscoveryPreferences' as never)}
        style={styles.button}
      />
      <Button
        title="Enable Location"
        variant="secondary"
        onPress={() => navigation.navigate('LocationPermission' as never)}
        style={styles.button}
      />
      <Button
        title="View Matches"
        onPress={() => navigation.navigate('Matches' as never)}
        style={styles.button}
      />
      <Button
        title="Messages"
        onPress={() => navigation.navigate('ChatList' as never)}
        style={styles.button}
      />
      <Button
        title="Blocked Users"
        variant="secondary"
        onPress={() => navigation.navigate('BlockedUsers' as never)}
        style={styles.button}
      />
      <Button
        title="My Reports"
        variant="secondary"
        onPress={() => navigation.navigate('MyReports' as never)}
        style={styles.button}
      />
      <Button
        title="Notifications"
        onPress={() => navigation.navigate('Notifications' as never)}
        style={styles.button}
      />
      <Button
        title="Notification Settings"
        variant="secondary"
        onPress={() => navigation.navigate('NotificationSettings' as never)}
        style={styles.button}
      />
      <Button
        title="Settings"
        variant="secondary"
        onPress={() => navigation.navigate('Settings' as never)}
        style={styles.button}
      />
      <Button
        title="Log out"
        variant="secondary"
        loading={loading}
        onPress={() => logout()}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 16, color: '#6b7280', marginVertical: 12 },
  button: { marginTop: 16, width: 200 },
});
