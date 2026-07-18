import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useReportStore } from '../store/reportStore';
import { ReportCard } from '../components/ReportCard';

/**
 * MyReportsScreen — lists the caller's own reports.
 *
 * Why: The management surface for the reporting system. Loads the list on mount
 * via the report store and lets the user soft-delete a report (e.g. if filed by
 * mistake). Reports are immutable after submission, so there is no edit action —
 * only delete. The moderation outcome (status changes) is reflected here as it
 * updates, but no admin/moderation UI is built (out of scope).
 */
export function MyReportsScreen() {
  const myReports = useReportStore((s) => s.myReports);
  const loading = useReportStore((s) => s.loading);
  const error = useReportStore((s) => s.error);
  const refresh = useReportStore((s) => s.refreshReports);
  const deleteReport = useReportStore((s) => s.deleteReport);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && myReports.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (error && myReports.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={() => void refresh()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (myReports.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You haven&apos;t submitted any reports.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={myReports}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <ReportCard report={item} onDelete={deleteReport} />
      )}
      onRefresh={() => void refresh()}
      refreshing={loading}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: { padding: 16, paddingBottom: 40 },
  muted: { fontSize: 16, color: '#6b7280' },
  error: { fontSize: 15, color: '#dc2626', marginBottom: 8 },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '700' },
});
