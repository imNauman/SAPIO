import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { SettingSection } from '../components/SettingSection';
import { SettingItem } from '../components/SettingItem';
import { Button } from '../components/Button';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

/**
 * Security settings screen.
 *
 * Why: Hosts Change Password and Change Email (both call the backend account
 * endpoints) plus placeholders for Two-Factor, Active Sessions, and Login
 * Devices (explicitly out of scope for this milestone). Last login is shown
 * from the settings bundle.
 */
export function SecuritySettingsScreen() {
  const { bundle, changePassword, changeEmail, saving, error } =
    useSettingsStore();

  const [mode, setMode] = React.useState<null | 'password' | 'email'>(null);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const lastSignIn = bundle?.account.lastSignInAt
    ? new Date(bundle.account.lastSignInAt).toLocaleString()
    : '—';

  const submitPassword = async () => {
    await changePassword({ currentPassword, newPassword });
    setMode(null);
    setCurrentPassword('');
    setNewPassword('');
  };

  const submitEmail = async () => {
    await changeEmail({ newEmail, password: currentPassword });
    setMode(null);
    setCurrentPassword('');
    setNewEmail('');
  };

  return (
    <ScrollView style={styles.container}>
      <SettingSection title="Account Security">
        <SettingItem
          label="Change Password"
          icon="key-outline"
          onPress={() => setMode('password')}
        />
        <SettingItem
          label="Change Email"
          icon="mail-outline"
          value={bundle?.account.email ?? ''}
          onPress={() => setMode('email')}
        />
      </SettingSection>

      <SettingSection title="Sessions">
        <SettingItem
          label="Active Sessions"
          hint="Manage devices where you're logged in"
          icon="phone-portrait-outline"
          onPress={() => {
            /* placeholder */
          }}
        />
        <SettingItem
          label="Two-Factor Authentication"
          hint="Add an extra layer of security"
          icon="shield-outline"
          onPress={() => {
            /* placeholder — out of scope */
          }}
        />
        <SettingItem
          label="Login Devices"
          hint="Devices used to sign in"
          icon="laptop-outline"
          onPress={() => {
            /* placeholder */
          }}
        />
        <SettingItem
          label="Last Login"
          value={lastSignIn}
          showChevron={false}
        />
      </SettingSection>

      {mode === 'password' ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Current password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="New password (min 8 characters)"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Update Password"
            loading={saving}
            disabled={!currentPassword || newPassword.length < 8}
            onPress={() => setConfirm(true)}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setMode(null)}
          />
        </View>
      ) : null}

      {mode === 'email' ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Change Email</Text>
          <TextInput
            style={styles.input}
            placeholder="New email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={newEmail}
            onChangeText={setNewEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password to confirm"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Update Email"
            loading={saving}
            disabled={!newEmail || !currentPassword}
            onPress={() => setConfirm(true)}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setMode(null)}
          />
        </View>
      ) : null}

      <ConfirmationDialog
        visible={confirm}
        title={mode === 'email' ? 'Update email?' : 'Update password?'}
        message="You may be asked to sign in again on other devices."
        confirmLabel="Confirm"
        loading={saving}
        onConfirm={async () => {
          try {
            if (mode === 'email') await submitEmail();
            else await submitPassword();
          } finally {
            setConfirm(false);
          }
        }}
        onCancel={() => setConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  form: { padding: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d1d6',
  },
  error: { color: '#ef4444', marginBottom: 10 },
});
