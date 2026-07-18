import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SubscriptionPlan, SubscriptionFeature, FEATURE_LABELS } from '../types/subscription';
import { UpgradeButton } from './UpgradeButton';

/**
 * SubscriptionCard — renders one plan in the catalog.
 *
 * Why: Reusable card showing the plan name, price, and its enabled features,
 * with an `UpgradeButton`. Feature labels are resolved dynamically from
 * `FEATURE_LABELS` (a presentation map, not a business rule) — the actual
 * enabled/disabled state comes from the API, never hardcoded.
 */
interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  features: SubscriptionFeature[];
  currentTier?: string;
  onUpgrade?: (plan: SubscriptionPlan) => void;
}

export function SubscriptionCard({
  plan,
  features,
  currentTier,
  onUpgrade,
}: SubscriptionCardProps) {
  const enabledKeys = features
    .filter((f) => f.value === true || f.value === 1)
    .map((f) => f.key);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{plan.name}</Text>
      <Text style={styles.price}>
        ${plan.monthlyPrice.toFixed(2)}/mo
        {plan.yearlyPrice > 0 ? `  ·  $${plan.yearlyPrice.toFixed(2)}/yr` : ''}
      </Text>
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
      <UpgradeButton
        tier={plan.tier}
        currentTier={currentTier}
        onPress={onUpgrade ? () => onUpgrade(plan) : undefined}
      />
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
  name: { fontSize: 18, fontWeight: '800', color: '#111827' },
  price: { fontSize: 15, color: '#2563eb', fontWeight: '700', marginVertical: 4 },
  features: { marginVertical: 8 },
  feature: { fontSize: 14, color: '#374151', marginBottom: 2 },
  muted: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
});
