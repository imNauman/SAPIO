import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { SettingSection } from '../components/SettingSection';
import { SettingSwitch } from '../components/SettingSwitch';

/**
 * Privacy settings screen.
 *
 * Why: Edits the `user_settings` privacy toggles. Each toggle calls
 * `updateSettings` (PATCH /settings) so the change persists immediately. The
 * Recommendation Engine and Discovery respect `discoverable` + the privacy
 * flags, so no duplicate filter logic lives here.
 */
export function PrivacySettingsScreen() {
  const { bundle, updateSettings, saving } = useSettingsStore();
  const s = bundle?.settings;

  const toggle = (key: keyof NonNullable<typeof s>, value: boolean) => {
    if (!s) return;
    updateSettings({ [key]: value } as any);
  };

  if (!s) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container}>
      <SettingSection title="Visibility">
        <SettingSwitch
          label="Show my age"
          value={s.showAge}
          onValueChange={(v) => toggle('showAge', v)}
          disabled={saving}
        />
        <SettingSwitch
          label="Show my distance"
          value={s.showDistance}
          onValueChange={(v) => toggle('showDistance', v)}
          disabled={saving}
        />
        <SettingSwitch
          label="Show online status"
          value={s.showOnlineStatus}
          onValueChange={(v) => toggle('showOnlineStatus', v)}
          disabled={saving}
        />
        <SettingSwitch
          label="Show last seen"
          value={s.showLastSeen}
          onValueChange={(v) => toggle('showLastSeen', v)}
          disabled={saving}
        />
      </SettingSection>

      <SettingSection title="Messaging">
        <SettingSwitch
          label="Allow messages from matches only"
          hint="Only people you've matched with can message you"
          value={s.allowMessagesFromMatchesOnly}
          onValueChange={(v) => toggle('allowMessagesFromMatchesOnly', v)}
          disabled={saving}
        />
      </SettingSection>

      <SettingSection title="Discovery">
        <SettingSwitch
          label="Discoverable"
          hint="Turn off to hide your profile from Discovery"
          value={s.discoverable}
          onValueChange={(v) => toggle('discoverable', v)}
          disabled={saving}
        />
      </SettingSection>

      <SettingSection title="Badge">
        <SettingSwitch
          label="Hide verified badge"
          hint="Hide the blue checkmark on your profile"
          value={s.hideVerifiedBadge}
          onValueChange={(v) => toggle('hideVerifiedBadge', v)}
          disabled={saving}
        />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
});
