import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/Button';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

/**
 * Delete Account screen.
 *
 * Why: Confirms the destructive soft-delete with a password prompt + a final
 * confirmation dialog. On success the store clears all cached data and the
 * auth session ends, returning the user to the login stack.
 */
export function DeleteAccountScreen() {
  const navigation = useNavigation();
  const { deleteAccount, saving, error } = useSettingsStore();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const onDelete = async () => {
    await deleteAccount({ password });
    setConfirm(false);
    // The auth store logout inside deleteAccount flips isAuthenticated -> login.
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.warning}>Delete your account?</Text>
        <Text style={styles.detail}>
          This will immediately hide your profile from Discovery, stop new
          matches, and remove your push notifications. Your existing chats stay
          visible to others as "Deleted User". This action cannot be undone from
          the app.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter your password to confirm"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Delete Account"
          variant="danger"
          loading={saving}
          disabled={password.length < 1}
          onPress={() => setConfirm(true)}
        />
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>

      <ConfirmationDialog
        visible={confirm}
        title="Permanently delete?"
        message="Your profile will be hidden and your sessions ended. This cannot be undone here."
        confirmLabel="Delete Account"
        danger
        loading={saving}
        onConfirm={onDelete}
        onCancel={() => setConfirm(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  warning: { fontSize: 20, fontWeight: '800', color: '#ef4444' },
  detail: { fontSize: 15, lineHeight: 22, color: '#3a3a3c', marginTop: 10 },
  form: { padding: 16 },
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
