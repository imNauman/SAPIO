import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { VerificationRequest } from '../lib/api/verification.api';
import { VerifiedBadge } from '../components/VerifiedBadge';

/**
 * Terminal status screen (approved / rejected).
 *
 * Why: Shows the outcome of a verification request. On approval it surfaces the
 * verified badge and explains the profile is now verified (the backend already
 * set `profile.is_verified = true`). On rejection it shows the reason and offers
 * a way back to start a new request.
 */
interface Props {
  request: VerificationRequest;
  onRestart: () => void;
}

export function VerificationStatusScreen({ request, onRestart }: Props) {
  const approved = request.status === 'approved';
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {approved ? 'Verified!' : 'Not Verified'}
        </Text>
        {approved && <VerifiedBadge verified size="medium" />}
      </View>

      {approved ? (
        <Text style={styles.body}>
          Your profile is now verified. The verified badge will appear across
          SAPIO and you&apos;ll get a small boost in discovery.
        </Text>
      ) : (
        <View>
          <Text style={styles.body}>
            Unfortunately your verification request was not approved.
          </Text>
          {request.rejectionReason ? (
            <Text style={styles.reason}>Reason: {request.rejectionReason}</Text>
          ) : null}
        </View>
      )}

      <Button title="Start New Request" onPress={onRestart} style={styles.button} />
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginRight: 10 },
  body: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24 },
  reason: { fontSize: 14, color: '#b91c1c', marginTop: 12, textAlign: 'center' },
  button: { marginTop: 20, alignSelf: 'center' },
});
