import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProfileForm, ProfileFormValues } from '../components/ProfileForm';
import { useProfileStore } from '../store/profileStore';
import { ProfileInput } from '../lib/api/profile.api';

/**
 * Create profile screen.
 *
 * Why: First-time users land here after sign-up. It reuses `ProfileForm` and
 * delegates the create-or-update decision to the profile store. On success it
 * navigates to the profile view.
 */
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

export function CreateProfileScreen() {
  const navigation = useNavigation();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const loading = useProfileStore((s) => s.loading);
  const error = useProfileStore((s) => s.error);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile(formToInput(values));
      navigation.reset({ index: 0, routes: [{ name: 'ViewProfile' as never }] });
    } catch {
      // error is surfaced via the store's `error`
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create your profile</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ProfileForm
        onSubmit={onSubmit}
        loading={loading}
        submitLabel="Create profile"
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
  error: {
    color: '#ef4444',
    fontSize: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
