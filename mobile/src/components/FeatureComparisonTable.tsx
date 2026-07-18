import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  PlanWithFeatures,
} from '../types/subscription';

/**
 * FeatureComparisonTable — compares feature availability across all plans.
 *
 * Why: A compact matrix so the user can see what each tier unlocks. Feature
 * state is read dynamically from each plan's `features` (resolved server-side),
 * never hardcoded. Rows are the canonical `FEATURE_KEYS`; columns are plans.
 */
interface FeatureComparisonTableProps {
  plans: PlanWithFeatures[];
}

export function FeatureComparisonTable({ plans }: FeatureComparisonTableProps) {
  if (plans.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No plans available.</Text>
      </View>
    );
  }

  const featureValueFor = (plan: PlanWithFeatures, key: string) => {
    const f = plan.features.find((x) => x.key === key);
    if (!f) return false;
    return f.value === true || f.value === 1;
  };

  return (
    <ScrollView horizontal style={styles.container}>
      <View>
        {/* Header row */}
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, styles.labelCell]}>
            Feature
          </Text>
          {plans.map((plan) => (
            <Text
              key={plan.id}
              style={[styles.cell, styles.headerCell, styles.planCell]}
            >
              {plan.name}
            </Text>
          ))}
        </View>
        {/* Feature rows */}
        {FEATURE_KEYS.map((key) => (
          <View key={key} style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]}>
              {FEATURE_LABELS[key] ?? key}
            </Text>
            {plans.map((plan) => {
              const on = featureValueFor(plan, key);
              return (
                <Text key={plan.id} style={[styles.cell, styles.planCell]}>
                  {on ? '✓' : '—'}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#374151',
  },
  labelCell: { width: 160, fontWeight: '600', color: '#111827' },
  planCell: { width: 90, textAlign: 'center' },
  headerCell: { fontWeight: '800', color: '#111827', backgroundColor: '#f9fafb' },
  muted: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', padding: 8 },
});
