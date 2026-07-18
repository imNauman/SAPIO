import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Slider } from '../components/Slider';
import { Button } from '../components/Button';
import { useRecommendationStore } from '../store/recommendationStore';
import { Gender } from '../lib/api/discovery.api';
import {
  RelationshipGoal,
  UpdatePreferencesInput,
} from '../lib/api/recommendation.api';

/**
 * RecommendationSettingsScreen — discovery preferences.
 *
 * Why: This is the ONLY place the user tunes the Recommendation Engine inputs.
 * The engine (backend) owns all ranking and inclusion; this screen just edits
 * the `user_preferences` row via `recommendationStore.updatePreferences`. After
 * saving, the deck should be refreshed by the caller (we navigate back to
 * Discovery). No ML/AI/boost/premium logic exists here — only filters and
 * weights the deterministic strategy reads.
 */
const GENDERS: Gender[] = ['male', 'female', 'non_binary', 'other'];
const GOALS: RelationshipGoal[] = [
  'casual',
  'dating',
  'serious',
  'friendship',
  'marriage',
];

export function RecommendationSettingsScreen() {
  const navigation = useNavigation();
  const preferences = useRecommendationStore((s) => s.preferences);
  const loading = useRecommendationStore((s) => s.loading);
  const saving = useRecommendationStore((s) => s.saving);
  const error = useRecommendationStore((s) => s.error);
  const loadPreferences = useRecommendationStore((s) => s.loadPreferences);
  const updatePreferences = useRecommendationStore((s) => s.updatePreferences);

  const [minimumAge, setMinimumAge] = React.useState(18);
  const [maximumAge, setMaximumAge] = React.useState(99);
  const [maximumDistanceKm, setMaximumDistanceKm] = React.useState(100);
  const [interestedIn, setInterestedIn] = React.useState<Gender[]>([]);
  const [relationshipGoal, setRelationshipGoal] =
    React.useState<RelationshipGoal | null>(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = React.useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = React.useState(false);
  const [hideInactiveUsers, setHideInactiveUsers] = React.useState(true);

  React.useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  React.useEffect(() => {
    if (preferences) {
      setMinimumAge(preferences.minimumAge);
      setMaximumAge(preferences.maximumAge);
      setMaximumDistanceKm(preferences.maximumDistanceKm);
      setInterestedIn(preferences.interestedIn);
      setRelationshipGoal(preferences.relationshipGoal);
      setShowVerifiedOnly(preferences.showVerifiedOnly);
      setShowOnlineOnly(preferences.showOnlineOnly);
      setHideInactiveUsers(preferences.hideInactiveUsers);
    }
  }, [preferences]);

  const toggleGender = (g: Gender) => {
    setInterestedIn((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const handleSave = async () => {
    const input: UpdatePreferencesInput = {
      minimumAge: Math.min(minimumAge, maximumAge),
      maximumAge: Math.max(minimumAge, maximumAge),
      maximumDistanceKm,
      interestedIn,
      relationshipGoal,
      showVerifiedOnly,
      showOnlineOnly,
      hideInactiveUsers,
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
        server-side.
      </Text>

      <Slider
        label="Minimum age"
        value={minimumAge}
        min={18}
        max={maximumAge}
        onValueChange={setMinimumAge}
        formatValue={(v) => String(v)}
      />
      <Slider
        label="Maximum age"
        value={maximumAge}
        min={minimumAge}
        max={99}
        onValueChange={setMaximumAge}
        formatValue={(v) => String(v)}
      />
      <Slider
        label="Maximum distance"
        value={maximumDistanceKm}
        min={1}
        max={200}
        onValueChange={setMaximumDistanceKm}
        formatValue={(v) => (v >= 200 ? '200+ km' : `${v} km`)}
      />

      <Text style={styles.section}>Interested in</Text>
      <View style={styles.chips}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.chip,
              interestedIn.includes(g) ? styles.chipActive : null,
            ]}
            onPress={() => toggleGender(g)}
          >
            <Text
              style={[
                styles.chipText,
                interestedIn.includes(g) ? styles.chipTextActive : null,
              ]}
            >
              {g.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Relationship goal</Text>
      <View style={styles.chips}>
        {GOALS.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.chip,
              relationshipGoal === goal ? styles.chipActive : null,
            ]}
            onPress={() =>
              setRelationshipGoal((prev) => (prev === goal ? null : goal))
            }
          >
            <Text
              style={[
                styles.chipText,
                relationshipGoal === goal ? styles.chipTextActive : null,
              ]}
            >
              {goal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Verified profiles only</Text>
        <Switch value={showVerifiedOnly} onValueChange={setShowVerifiedOnly} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Online now only</Text>
        <Switch value={showOnlineOnly} onValueChange={setShowOnlineOnly} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Hide inactive users</Text>
        <Switch value={hideInactiveUsers} onValueChange={setHideInactiveUsers} />
      </View>

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
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  note: { fontSize: 13, color: '#6b7280', marginVertical: 8 },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#ff5864', borderColor: '#ff5864' },
  chipText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  toggleLabel: { fontSize: 15, color: '#111827' },
  error: { color: '#dc2626', marginTop: 12, fontSize: 13 },
  saveButton: { marginTop: 24 },
});
