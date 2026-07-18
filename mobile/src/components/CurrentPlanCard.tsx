import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserSubscription, FEATURE_LABELS } from '../types/subscription';

/**
 * CurrentPlanCard — shows the caller's active plan + its features.
 *
 * Why: The "you are here" surface on the Premium screen. Reads the resolved
 * subscription (Free by default) and lists the enabled features dynamically.
 */
interface CurrentPlanCardProps {
  subscription: UserSubscription | null;
}

export function CurrentPlanCard({ subscription }: CurrentPlanCardProps) {
  if (!subscription) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>Loading your plan…</Text>
      </View>
    );
  }

  const { plan, features } = subscription;
  const enabledKeys = features
    .filter((f) => f.value === true || f.value === 1)
    .map((f) => f.key);

  return (
    <View style={[styles.card, styles.highlight]}>
      <Text style={styles.label}>Your current plan</Text>
      <Text style={styles.name}>{plan.name}</Text>
      <Text style={styles.status}>{subscription.status.toUpperCase()}</Text>
      <View style={styles.features}>
        {enabledKeys.length === 0 ? (
          <Text style={styles.muted}>Basic features</Text>
        ) : (
          enabledKeys.map((key) => (
            <Text key={key} style={styles.feature}>
              • {FEATURE_LABELS[key] ?? key}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  highlight: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  label: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 2 },
  status: { fontSize: 13, color: '#2563eb', fontWeight: '700', marginBottom: 8 },
  features: { marginTop: 4 },
  feature: { fontSize: 14, color: '#374151', marginBottom: 2 },
  muted: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
});
