import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProfileForm, ProfileFormValues } from '../components/ProfileForm';
import { useProfileStore } from '../store/profileStore';
import { ProfileInput } from '../lib/api/profile.api';

/**
 * Edit profile screen.
 *
 * Why: Reuses `ProfileForm` pre-filled from the store. On save it refreshes the
 * profile and returns to the previous screen.
 */
function profileToForm(profile: NonNullable<ReturnType<typeof useProfileStore.getState>['profile']>) {
  return {
    username: profile.username ?? '',
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    birthDate: profile.birthDate ? new Date(profile.birthDate) : null,
    gender: profile.gender,
    interestedIn: profile.interestedIn,
    relationshipGoal: profile.relationshipGoal,
    heightCm: profile.heightCm,
    occupation: profile.occupation ?? '',
    education: profile.education ?? '',
    city: profile.city ?? '',
    country: profile.country ?? '',
  };
}

function formToInput(v: ProfileFormValues): ProfileInput {
  return {
    username: v.username ? v.username : undefined,
    displayName: v.displayName ? v.displayName : undefined,
    bio: v.bio ? v.bio : undefined,
    birthDate: v.birthDate ? v.birthDate.toISOString().split('T')[0] : undefined,
    gender: v.gender ?? undefined,
    interestedIn: v.interestedIn,
    relationshipGoal: v.relationshipGoal ?? undefined,
    heightCm: v.heightCm ?? undefined,
    occupation: v.occupation ? v.occupation : undefined,
    education: v.education ? v.education : undefined,
    city: v.city ? v.city : undefined,
    country: v.country ? v.country : undefined,
  };
}

export function EditProfileScreen() {
  const navigation = useNavigation();
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const refreshProfile = useProfileStore((s) => s.refreshProfile);
  const loading = useProfileStore((s) => s.loading);
  const error = useProfileStore((s) => s.error);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile(formToInput(values));
      await refreshProfile();
      navigation.goBack();
    } catch {
      // error surfaced via store
    }
  };

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No profile loaded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Edit profile</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ProfileForm
        defaultValues={profileToForm(profile)}
        onSubmit={onSubmit}
        loading={loading}
        submitLabel="Save changes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  error: { color: '#ef4444', fontSize: 14, paddingHorizontal: 20, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
