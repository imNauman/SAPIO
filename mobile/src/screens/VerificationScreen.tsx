import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useVerificationStore } from '../store/verificationStore';
import { VerificationInstructionsScreen } from './VerificationInstructionsScreen';
import { SelfieCaptureScreen } from './SelfieCaptureScreen';
import { VerificationPendingScreen } from './VerificationPendingScreen';
import { VerificationStatusScreen } from './VerificationStatusScreen';
import { SelfieFile } from '../lib/api/verification.api';

/**
 * Verification hub.
 *
 * Why: Routes the user to the right sub-screen based on verification state:
 *  - not_started / rejected / expired → instructions → selfie capture
 *  - pending / under_review          → pending (with cancel)
 *  - approved                        → status (badge + boost info)
 * State lives in `useVerificationStore`; this screen orchestrates the local
 * phase (instructions vs capture) and renders the appropriate view. AI
 * verification is a future plug-in and is not handled here.
 */
type Phase = 'instructions' | 'capture';

export function VerificationScreen() {
  const navigation = useNavigation();
  const status = useVerificationStore((s) => s.status);
  const request = useVerificationStore((s) => s.request);
  const loading = useVerificationStore((s) => s.loading);
  const refreshStatus = useVerificationStore((s) => s.refreshStatus);
  const submit = useVerificationStore((s) => s.submit);
  const cancel = useVerificationStore((s) => s.cancel);

  const [phase, setPhase] = React.useState<Phase>('instructions');

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleSubmit = async (selfies: SelfieFile[]) => {
    try {
      await submit(selfies);
      setPhase('instructions');
    } catch {
      // error is surfaced via the store; keep the user on the capture screen.
    }
  };

  const handleCancel = async () => {
    try {
      await cancel();
      setPhase('instructions');
    } catch {
      // error surfaced via store
    }
  };

  const goHome = () => navigation.navigate('Home' as never);

  let content: React.ReactNode;
  if (status === 'pending' || status === 'under_review') {
    content = (
      <VerificationPendingScreen
        request={request!}
        onCancel={handleCancel}
        cancelling={loading}
      />
    );
  } else if (status === 'approved' || status === 'rejected') {
    content = <VerificationStatusScreen request={request!} onRestart={goHome} />;
  } else if (phase === 'capture') {
    content = (
      <SelfieCaptureScreen
        onCancel={() => setPhase('instructions')}
        onSubmit={handleSubmit}
        submitting={loading}
      />
    );
  } else {
    content = (
      <VerificationInstructionsScreen onStart={() => setPhase('capture')} />
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
});
