import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { useProfileStore } from '../store/profileStore';
import { usePhotoStore } from '../store/photoStore';
import { SettingSection } from '../components/SettingSection';
import { SettingItem } from '../components/SettingItem';
import { VerifiedBadge } from '../components/VerifiedBadge';

/**
 * Account settings screen.
 *
 * Why: Surfaces the user's identity (photo, name, username, email, phone,
 * verification, subscription) and routes to the existing Edit Profile, Photos,
 * Verification, and Premium screens — reusing them rather than rebuilding them.
 */
export function AccountSettingsScreen() {
  const navigation = useNavigation();
  const { bundle } = useSettingsStore();
  const profile = useProfileStore((s) => s.profile);
  const photos = usePhotoStore((s) => s.photos);
  const account = bundle?.account;
  const primaryPhoto = photos.find((p) => p.isPrimary)?.photoUrl;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {primaryPhoto ? (
          <Image source={{ uri: primaryPhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(profile?.displayName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile?.displayName ?? '—'}</Text>
          {profile?.isVerified ? (
            <VerifiedBadge verified size="small" />
          ) : null}
        </View>
        <Text style={styles.username}>@{profile?.username ?? 'username'}</Text>
      </View>

      <SettingSection title="Profile">
        <SettingItem
          label="Edit Profile"
          icon="create-outline"
          onPress={() => navigation.navigate('EditProfile' as never)}
        />
        <SettingItem
          label="Manage Photos"
          icon="images-outline"
          onPress={() => navigation.navigate('PhotoGallery' as never)}
        />
        <SettingItem
          label="Verification"
          icon="checkmark-circle-outline"
          value={profile?.isVerified ? 'Verified' : 'Not verified'}
          onPress={() => navigation.navigate('Verification' as never)}
        />
        <SettingItem
          label="Subscription"
          icon="star-outline"
          value={account?.isPremium ? account.subscriptionPlan ?? 'Premium' : 'Free'}
          onPress={() => navigation.navigate('Premium' as never)}
        />
      </SettingSection>

      <SettingSection title="Contact">
        <SettingItem
          label="Email"
          value={account?.email ?? '—'}
          showChevron={false}
        />
        <SettingItem
          label="Phone"
          hint="Not set"
          value="Add"
          onPress={() => {
            /* placeholder — phone capture out of scope */
          }}
        />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ececec',
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  avatarPlaceholder: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  username: { fontSize: 14, color: '#8a8a8e', marginTop: 2 },
});
