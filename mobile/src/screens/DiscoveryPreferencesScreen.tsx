import React from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { AgeRangeSlider } from '../components/AgeRangeSlider';
import { DistanceSlider } from '../components/DistanceSlider';
import { RelationshipGoalSelector } from '../components/RelationshipGoalSelector';
import { VerifiedOnlySwitch } from '../components/VerifiedOnlySwitch';
import { GenderSelector } from '../components/GenderSelector';
import { useDiscoveryPreferencesStore } from '../store/discoveryPreferencesStore';
import { useProfileStore } from '../store/profileStore';
import { Gender } from '../lib/api/discovery.api';
import {
  RelationshipGoal,
  UpdatePreferencesInput,
} from '../lib/api/recommendation.api';

/**
 * DiscoveryPreferencesScreen — the canonical discovery filters screen.
 *
 * Why: This is the ONLY place the user tunes the Recommendation Engine inputs on
 * mobile. The engine (backend) owns all ranking and inclusion; this screen just
 * edits the `discovery_preferences` row via `discoveryPreferencesStore`. After
 * saving, the deck should be refreshed by the caller (we navigate back to
 * Discovery). No ML/AI/boost/premium logic exists here — only filters the
 * deterministic strategy reads. Changing preferences immediately affects
 * discovery because the engine re-ranks on the next feed fetch.
 */
const GENDERS: Gender[] = ['male', 'female', 'non_binary', 'other'];
const GOALS: RelationshipGoal[] = [
  'casual',
  'dating',
  'serious',
  'friendship',
  'marriage',
];

export function DiscoveryPreferencesScreen() {
  const navigation = useNavigation();
  const preferences = useDiscoveryPreferencesStore((s) => s.preferences);
  const loading = useDiscoveryPreferencesStore((s) => s.loading);
  const saving = useDiscoveryPreferencesStore((s) => s.saving);
  const error = useDiscoveryPreferencesStore((s) => s.error);
  const loadPreferences = useDiscoveryPreferencesStore((s) => s.loadPreferences);
  const updatePreferences = useDiscoveryPreferencesStore(
    (s) => s.updatePreferences,
  );

  const isPremium = useProfileStore((s) => s.profile?.isPremium ?? false);

  const [minimumAge, setMinimumAge] = React.useState(18);
  const [maximumAge, setMaximumAge] = React.useState(99);
  const [maximumDistanceKm, setMaximumDistanceKm] = React.useState(50);
  const [showMeGender, setShowMeGender] = React.useState<Gender[]>([]);
  const [relationshipGoal, setRelationshipGoal] =
    React.useState<RelationshipGoal | null>(null);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);

  React.useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  React.useEffect(() => {
    if (preferences) {
      setMinimumAge(preferences.minimumAge);
      setMaximumAge(preferences.maximumAge);
      setMaximumDistanceKm(preferences.maximumDistanceKm);
      setShowMeGender(preferences.interestedIn as Gender[]);
      setRelationshipGoal(preferences.relationshipGoal);
      setVerifiedOnly(preferences.showVerifiedOnly);
    }
  }, [preferences]);

  const toggleGender = (g: Gender) => {
    setShowMeGender((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const handleSave = async () => {
    const input: UpdatePreferencesInput = {
      minimumAge: Math.min(minimumAge, maximumAge),
      maximumAge: Math.max(minimumAge, maximumAge),
      maximumDistanceKm,
      interestedIn: showMeGender,
      relationshipGoal,
      showVerifiedOnly: verifiedOnly,
      // Keep the engine-compat fields in sync with the canonical row.
      hideInactiveUsers: true,
    };
    try {
      await updatePreferences(input);
      navigation.goBack();
    } catch {
      // error is surfaced via store.error
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Discovery Preferences</Text>
      <Text style={styles.note}>
        These filters tune the recommendation engine. Ranking is computed
        server-side and updates your discovery feed immediately.
      </Text>

      <AgeRangeSlider
        minimumAge={minimumAge}
        maximumAge={maximumAge}
        onMinimumChange={setMinimumAge}
        onMaximumChange={setMaximumAge}
      />

      <DistanceSlider
        value={maximumDistanceKm}
        max={200}
        isPremium={isPremium}
        onValueChange={setMaximumDistanceKm}
      />

      <GenderSelector
        value={showMeGender}
        options={GENDERS}
        onToggle={toggleGender}
      />

      <RelationshipGoalSelector
        value={relationshipGoal}
        options={GOALS}
        onSelect={setRelationshipGoal}
      />

      <VerifiedOnlySwitch value={verifiedOnly} onValueChange={setVerifiedOnly} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title="Save preferences"
        loading={saving || loading}
        onPress={handleSave}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  note: { fontSize: 13, color: '#6b7280', marginVertical: 8 },
  error: { color: '#ef4444', marginTop: 12 },
  saveButton: { marginTop: 20 },
});
