import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { VerificationRequest } from '../lib/api/verification.api';

/**
 * Pending / under-review screen.
 *
 * Why: Shown while a verification request is active (pending or under_review).
 * Informs the user their selfies are being reviewed and offers a cancel action.
 * No auto-decision is made on the client.
 */
interface Props {
  request: VerificationRequest;
  onCancel: () => void;
  cancelling: boolean;
}

export function VerificationPendingScreen({ request, onCancel, cancelling }: Props) {
  const label =
    request.status === 'under_review' ? 'Under review' : 'Submitted';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.body}>
        Your selfies were submitted on{' '}
        {new Date(request.submittedAt).toLocaleDateString()}. We&apos;ll mark your
        profile as verified once our team finishes the review.
      </Text>
      <Text style={styles.note}>
        You can cancel this request and submit new selfies later.
      </Text>
      <Button
        title="Cancel Request"
        variant="secondary"
        onPress={onCancel}
        loading={cancelling}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  body: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24 },
  note: { fontSize: 13, color: '#6b7280', fontStyle: 'italic', marginVertical: 16 },
  button: { marginTop: 8, alignSelf: 'center' },
});
