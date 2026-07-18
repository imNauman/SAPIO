import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { CurrentPlanCard } from '../components/CurrentPlanCard';
import { FeatureComparisonTable } from '../components/FeatureComparisonTable';
import { PlanWithFeatures } from '../types/subscription';

/**
 * PremiumScreen — the Premium Membership hub.
 *
 * Why: Composes the caller's current plan (`CurrentPlanCard`), a feature
 * comparison matrix (`FeatureComparisonTable`), and the catalog of plans
 * (`SubscriptionCard` + `UpgradeButton`). Purchases are not implemented yet, so
 * upgrade buttons are disabled placeholders. Feature state is resolved
 * dynamically from the API — nothing is hardcoded here.
 */
export function PremiumScreen() {
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription);
  const availablePlans = useSubscriptionStore((s) => s.availablePlans);
  const plansWithFeatures = useSubscriptionStore((s) => s.plansWithFeatures);
  const loading = useSubscriptionStore((s) => s.loading);
  const error = useSubscriptionStore((s) => s.error);
  const refreshSubscription = useSubscriptionStore((s) => s.refreshSubscription);
  const refreshPlans = useSubscriptionStore((s) => s.refreshPlans);

  React.useEffect(() => {
    void refreshSubscription();
    void refreshPlans();
  }, [refreshSubscription, refreshPlans]);

  const currentTier = currentSubscription?.plan.tier;

  // Unified list: prefer the feature-enriched plans; fall back to the bare
  // catalog (cards show no per-plan features in that case).
  const plans: PlanWithFeatures[] =
    plansWithFeatures.length > 0
      ? plansWithFeatures
      : availablePlans.map((plan) => ({ ...plan, features: [] }));

  const onRefresh = React.useCallback(() => {
    void refreshSubscription();
    void refreshPlans();
  }, [refreshSubscription, refreshPlans]);

  if (error && availablePlans.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={onRefresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={plans}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Premium Membership</Text>
          <Text style={styles.subtitle}>
            Unlock more with a premium plan. Purchases coming soon.
          </Text>
          <CurrentPlanCard subscription={currentSubscription} />
          <Text style={styles.section}>Compare plans</Text>
          <FeatureComparisonTable plans={plans} />
          <Text style={styles.section}>Choose a plan</Text>
        </View>
      }
      renderItem={({ item }) => (
        <SubscriptionCard
          plan={item}
          features={item.features}
          currentTier={currentTier}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  list: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  error: { fontSize: 15, color: '#dc2626', marginBottom: 8 },
  link: { fontSize: 15, color: '#2563eb', fontWeight: '700' },
});
