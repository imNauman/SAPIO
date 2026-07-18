import React from 'react';
import { Button } from './Button';

/**
 * UpgradeButton — CTA for upgrading to a plan.
 *
 * Why: Purchases are NOT implemented yet (payment gateways are a future
 * milestone). The button is intentionally disabled and shows "Coming soon" so
 * the UI is complete and the seam is obvious. When billing lands, wire
 * `onPress` to the relevant store/payment action.
 */
interface UpgradeButtonProps {
  tier: string;
  currentTier?: string;
  onPress?: () => void;
}

export function UpgradeButton({ tier, currentTier, onPress }: UpgradeButtonProps) {
  const isCurrent = currentTier === tier;
  const title = isCurrent ? 'Current Plan' : 'Upgrade';
  return (
    <Button
      title={title}
      variant={isCurrent ? 'secondary' : 'primary'}
      disabled={isCurrent || true}
      onPress={onPress ?? (() => undefined)}
    />
  );
}
