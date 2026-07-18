import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { useProfileStore } from '../store/profileStore';
import { usePhotoStore } from '../store/photoStore';
import { useAuthStore } from '../store/authStore';
import { SettingSection } from '../components/SettingSection';
import { SettingItem } from '../components/SettingItem';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

/**
 * Main Settings screen.
 *
 * Why: The hub for every settings sub-area. It reuses the existing
 * NotificationSettings and RecommendationSettings screens (no duplication) and
 * routes to the new Account / Privacy / Security / Help / About / Delete
 * screens. Logout and Delete Account are destructive actions gated by a
 * confirmation dialog.
 */
export function SettingsScreen() {
  const navigation = useNavigation();
  const { bundle, logout, loading } = useSettingsStore();
  const profile = useProfileStore((s) => s.profile);
  const photos = usePhotoStore((s) => s.photos);
  const user = useAuthStore((s) => s.user);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const account = bundle?.account;
  const primaryPhoto = photos.find((p) => p.isPrimary)?.photoUrl;

  return (
    <ScrollView style={styles.container}>
      {/* Account summary header */}
      <View style={styles.header}>
        {primaryPhoto ? (
          <Image source={{ uri: primaryPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(profile?.displayName ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.displayName ?? 'Your Account'}</Text>
        <Text style={styles.email}>{account?.email ?? user?.email ?? ''}</Text>
        {account?.isPremium ? (
          <Text style={styles.premium}>{account.subscriptionPlan ?? 'Premium'}</Text>
        ) : null}
      </View>

      <SettingSection title="Account">
        <SettingItem
          label="Account"
          hint="Profile, photos, verification, subscription"
          icon="person-outline"
          onPress={() => navigation.navigate('AccountSettings' as never)}
        />
      </SettingSection>

      <SettingSection title="Preferences">
        <SettingItem
          label="Privacy"
          icon="lock-closed-outline"
          onPress={() => navigation.navigate('PrivacySettings' as never)}
        />
        <SettingItem
          label="Notifications"
          icon="notifications-outline"
          onPress={() => navigation.navigate('NotificationSettings' as never)}
        />
        <SettingItem
          label="Discovery"
          icon="compass-outline"
          onPress={() => navigation.navigate('DiscoveryPreferences' as never)}
        />
        <SettingItem
          label="Security"
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate('SecuritySettings' as never)}
        />
      </SettingSection>

      <SettingSection title="Support">
        <SettingItem
          label="Help & Support"
          icon="help-circle-outline"
          onPress={() => navigation.navigate('HelpSupport' as never)}
        />
        <SettingItem
          label="About SAPIO"
          icon="information-circle-outline"
          onPress={() => navigation.navigate('About' as never)}
        />
      </SettingSection>

      <SettingSection title="Session">
        <SettingItem
          label="Log out"
          icon="log-out-outline"
          danger
          showChevron={false}
          onPress={() => setConfirmLogout(true)}
        />
        <SettingItem
          label="Delete Account"
          hint="Permanently hide your profile and data"
          icon="trash-outline"
          danger
          showChevron={false}
          onPress={() => navigation.navigate('DeleteAccount' as never)}
        />
      </SettingSection>

      <View style={styles.footer}>
        <Text style={styles.version}>SAPIO v1.0.0</Text>
      </View>

      <ConfirmationDialog
        visible={confirmLogout}
        title="Log out?"
        message="You will be signed out of this device."
        confirmLabel="Log out"
        danger
        loading={loading}
        onConfirm={async () => {
          await logout();
          setConfirmLogout(false);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececec',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  email: { fontSize: 14, color: '#8a8a8e', marginTop: 2 },
  premium: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 12, color: '#c7c7cc' },
});
