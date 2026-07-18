import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BLOCK_REASONS, BlockReason } from '../lib/api/block.api';

/**
 * BlockConfirmationModal — confirms a block and lets the user pick a reason.
 *
 * Why: Blocking is immediate and affects every surface, so we ask for
 * confirmation and an optional reason before calling the backend. The reason
 * chips mirror the backend `BLOCK_REASONS`. Selecting a reason is optional;
 * "Block" always submits (reason may be undefined).
 */
interface BlockConfirmationModalProps {
  visible: boolean;
  displayName: string | null;
  loading?: boolean;
  onConfirm: (reason?: BlockReason) => void;
  onCancel: () => void;
}

export function BlockConfirmationModal({
  visible,
  displayName,
  loading = false,
  onConfirm,
  onCancel,
}: BlockConfirmationModalProps) {
  const [selected, setSelected] = React.useState<BlockReason | null>(null);

  React.useEffect(() => {
    if (visible) setSelected(null);
  }, [visible]);

  const name = displayName || 'this user';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Block {name}?</Text>
          <Text style={styles.subtitle}>
            They will no longer see you in discovery, recommendations, or
            matches, and you won&apos;t be able to message them. This is immediate.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {BLOCK_REASONS.map((reason) => {
              const active = selected === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => setSelected(active ? null : reason)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}
                  >
                    {reason.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirm, loading ? styles.disabled : null]}
              onPress={() => onConfirm(selected ?? undefined)}
              disabled={loading}
            >
              <Text style={styles.confirmText}>
                {loading ? 'Blocking…' : 'Block'}
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
  },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, lineHeight: 20 },
  chips: { gap: 8, paddingVertical: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#fee2e2' },
  chipText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  chipTextActive: { color: '#b91c1c', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
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
