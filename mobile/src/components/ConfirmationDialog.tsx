import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

/**
 * A reusable confirmation modal (used for logout, delete account, etc.).
 *
 * Why: Several settings actions need a destructive confirmation. Centralizing
 * the dialog avoids duplicating the overlay + buttons in every screen.
 */
interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                danger ? styles.confirmDanger : styles.confirm,
              ]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={[styles.confirmText, loading ? styles.disabled : null]}>
                {loading ? 'Please wait…' : confirmLabel}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  title: { fontSize: 18, fontWeight: '700', color: '#1c1c1e' },
  message: { fontSize: 15, color: '#3a3a3c', marginTop: 8, lineHeight: 21 },
  actions: { flexDirection: 'row', marginTop: 20 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: '#f2f2f7', marginRight: 8 },
  confirm: { backgroundColor: '#2563eb', marginLeft: 8 },
  confirmDanger: { backgroundColor: '#ef4444', marginLeft: 8 },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.6 },
});
