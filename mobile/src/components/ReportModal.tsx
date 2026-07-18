import React from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useReportStore } from '../store/reportStore';
import { ReportCategory } from '../lib/api/report.api';

/**
 * ReportModal — reusable report composer.
 *
 * Why: A single modal powers reporting a profile, a message, or a photo. The
 * caller passes the `target` + `targetId` (and an optional display name for the
 * copy). The modal loads categories from the report store, lets the user pick
 * exactly one category, optionally add a description and up to 5 evidence image
 * URLs, then submits via the matching store action. On success it closes and
 * fires `onSubmitted`. Self-report and duplicate-active-report rejections come
 * back as store errors and are shown inline. AI moderation, automatic bans, and
 * push notifications are out of scope — this only records the report.
 */
type ReportTarget = 'profile' | 'message' | 'photo';

interface ReportModalProps {
  visible: boolean;
  target: ReportTarget;
  targetId: string;
  displayName?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

const MAX_EVIDENCE = 5;

export function ReportModal({
  visible,
  target,
  targetId,
  displayName,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const categories = useReportStore((s) => s.categories);
  const refreshCategories = useReportStore((s) => s.refreshCategories);
  const submitProfile = useReportStore((s) => s.submitProfile);
  const submitMessage = useReportStore((s) => s.submitMessage);
  const submitPhoto = useReportStore((s) => s.submitPhoto);

  const [selected, setSelected] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [evidence, setEvidence] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setSelected(null);
      setDescription('');
      setEvidence([]);
      setError(null);
      void refreshCategories();
    }
  }, [visible, refreshCategories]);

  const addEvidenceField = () => {
    if (evidence.length < MAX_EVIDENCE) setEvidence((e) => [...e, '']);
  };
  const updateEvidence = (value: string, index: number) => {
    setEvidence((e) => e.map((v, i) => (i === index ? value : v)));
  };
  const removeEvidence = (index: number) => {
    setEvidence((e) => e.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError('Please choose a reason.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      categoryId: selected,
      description: description.trim() || undefined,
      evidence: evidence.map((e) => e.trim()).filter(Boolean),
    };
    try {
      if (target === 'profile') await submitProfile(targetId, payload);
      else if (target === 'message') await submitMessage(targetId, payload);
      else await submitPhoto(targetId, payload);
      onSubmitted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const targetLabel =
    target === 'profile'
      ? displayName || 'this user'
      : target === 'message'
        ? 'this message'
        : 'this photo';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Report {targetLabel}</Text>
          <Text style={styles.subtitle}>
            Reports are reviewed by our team. You can&apos;t undo a report, and
            you won&apos;t be notified of the outcome.
          </Text>

          <Text style={styles.sectionLabel}>Reason</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {categories.map((c: ReportCategory) => {
              const active = selected === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setSelected(active ? null : c.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Details (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Tell us what happened"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={2000}
          />

          <View style={styles.evidenceHeader}>
            <Text style={styles.sectionLabel}>Evidence links (optional)</Text>
            {evidence.length < MAX_EVIDENCE ? (
              <TouchableOpacity onPress={addEvidenceField}>
                <Text style={styles.addLink}>+ Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {evidence.map((url, i) => (
            <View key={i} style={styles.evidenceRow}>
              <TextInput
                style={[styles.input, styles.evidenceInput]}
                placeholder="https://…"
                value={url}
                onChangeText={(v) => updateEvidence(v, i)}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity onPress={() => removeEvidence(i)}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirm,
                submitting ? styles.disabled : null,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.confirmText}>
                {submitting ? 'Submitting…' : 'Submit report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 19 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#fee2e2' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#b91c1c', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  addLink: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  evidenceInput: { flex: 1 },
  removeLink: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancel: { backgroundColor: '#f3f4f6' },
  cancelText: { color: '#374151', fontWeight: '700' },
  confirm: { backgroundColor: '#dc2626' },
  confirmText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
