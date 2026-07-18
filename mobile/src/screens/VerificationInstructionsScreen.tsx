import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from '../components/Button';

/**
 * Verification instructions.
 *
 * Why: Explains the selfie-based verification flow before the user submits
 * photos. Keeps expectations clear: one active request, manual review, no
 * face-recognition/ID logic on the client. "Start" advances to selfie capture.
 */
interface Props {
  onStart: () => void;
}

export function VerificationInstructionsScreen({ onStart }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Get Verified</Text>
      <Text style={styles.body}>
        Verification helps people know you&apos;re a real person. Take a few clear
        selfies — we&apos;ll review them and mark your profile as verified.
      </Text>
      <View style={styles.list}>
        <Text style={styles.item}>• Use good lighting and a clear face photo</Text>
        <Text style={styles.item}>• Take 1 to 5 selfies</Text>
        <Text style={styles.item}>• Only one request can be active at a time</Text>
        <Text style={styles.item}>• Review is done by our team (no auto-decision)</Text>
      </View>
      <Text style={styles.note}>
        This is a selfie attestation only. No government ID or biometric
        matching is used.
      </Text>
      <Button title="Start Verification" onPress={onStart} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 12 },
  body: { fontSize: 16, color: '#374151', lineHeight: 24 },
  list: { marginVertical: 16 },
  item: { fontSize: 15, color: '#374151', marginVertical: 4 },
  note: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginBottom: 16 },
  button: { marginTop: 8, alignSelf: 'center' },
});
