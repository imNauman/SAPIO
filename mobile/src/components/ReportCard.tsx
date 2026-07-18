import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Report } from '../lib/api/report.api';

/**
 * ReportCard — a single report row in MyReportsScreen.
 *
 * Why: Shows the category, target type, status, priority, and description of a
 * report the user filed. A "Delete" action soft-deletes it (reports are
 * immutable, so there is no edit). Status/priority are server-managed and
 * surfaced read-only so the user can see progress without a moderation console.
 */
interface ReportCardProps {
  report: Report;
  onDelete: (id: string) => void;
}

function targetLabel(report: Report): string {
  if (report.messageId) return 'Message';
  if (report.photoId) return 'Photo';
  return 'Profile';
}

const STATUS_COLORS: Record<Report['status'], string> = {
  open: '#2563eb',
  under_review: '#d97706',
  resolved: '#16a34a',
  dismissed: '#6b7280',
};

export function ReportCard({ report, onDelete }: ReportCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>
          {report.categoryName ?? 'Report'}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: STATUS_COLORS[report.status] },
          ]}
        >
          <Text style={styles.statusText}>{report.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {targetLabel(report)} · priority {report.priority}
      </Text>

      {report.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {report.description}
        </Text>
      ) : null}

      {report.evidence.length > 0 ? (
        <Text style={styles.evidence}>
          {report.evidence.length} evidence image
          {report.evidence.length > 1 ? 's' : ''}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(report.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteText}>Delete report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  description: { fontSize: 14, color: '#374151', marginTop: 8, lineHeight: 20 },
  evidence: { fontSize: 13, color: '#2563eb', marginTop: 8 },
  deleteBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  deleteText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
});
