import React from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { Button } from '../components/Button';
import { pickAndProcessImage } from '../lib/image';
import { SelfieFile } from '../lib/api/verification.api';

/**
 * Selfie capture screen.
 *
 * Why: Lets the user pick 1–5 selfies from the camera/library (reusing the
 * shared `pickAndProcessImage` helper) and submit them. Photos are uploaded as
 * multipart by the verification store. No face recognition happens here — the
 * images are simply collected for later (manual or future AI) review.
 */
interface Props {
  onCancel: () => void;
  onSubmit: (selfies: SelfieFile[]) => void;
  submitting: boolean;
}

const MAX_SELFIES = 5;

export function SelfieCaptureScreen({ onCancel, onSubmit, submitting }: Props) {
  const [selfies, setSelfies] = React.useState<SelfieFile[]>([]);

  const addSelfie = async (source: 'library' | 'camera') => {
    if (selfies.length >= MAX_SELFIES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_SELFIES} selfies.`);
      return;
    }
    try {
      const picked = await pickAndProcessImage({ source });
      if (!picked) return;
      const name = picked.uri.split('/').pop() ?? `selfie-${selfies.length + 1}.jpg`;
      setSelfies((prev) => [
        ...prev,
        { uri: picked.uri, name, type: 'image/jpeg' },
      ]);
    } catch (e) {
      Alert.alert('Could not add photo', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const removeSelfie = (index: number) => {
    setSelfies((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Selfies</Text>
      <Text style={styles.subtitle}>
        {selfies.length} / {MAX_SELFIES} added
      </Text>

      <View style={styles.grid}>
        {selfies.map((s, i) => (
          <View key={i} style={styles.thumbWrap}>
            <Image source={{ uri: s.uri }} style={styles.thumb} />
            <Button
              title="✕"
              variant="secondary"
              onPress={() => removeSelfie(i)}
              style={styles.remove}
            />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title="From Library"
          variant="secondary"
          onPress={() => addSelfie('library')}
          style={styles.actionBtn}
        />
        <Button
          title="Camera"
          variant="secondary"
          onPress={() => addSelfie('camera')}
          style={styles.actionBtn}
        />
      </View>

      <Button
        title="Submit for Review"
        onPress={() => onSubmit(selfies)}
        loading={submitting}
        disabled={selfies.length === 0}
        style={styles.submit}
      />
      <Button
        title="Cancel"
        variant="secondary"
        onPress={onCancel}
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  thumbWrap: { margin: 6, position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#e5e7eb' },
  remove: { position: 'absolute', top: -6, right: -6, width: 28, height: 28 },
  actions: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  actionBtn: { marginHorizontal: 8 },
  submit: { marginTop: 16, alignSelf: 'center' },
});
