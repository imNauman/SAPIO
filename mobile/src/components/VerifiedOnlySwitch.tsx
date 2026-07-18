import React from 'react';
import { SettingSwitch } from './SettingSwitch';

/**
 * VerifiedOnlySwitch — toggle to show only verified profiles.
 *
 * Why: Thin wrapper over `SettingSwitch` so the Discovery Preferences screen has
 * a semantically named component. The engine hard-filters on this flag.
 */
interface VerifiedOnlySwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
}

export function VerifiedOnlySwitch({
  value,
  onValueChange,
}: VerifiedOnlySwitchProps) {
  return (
    <SettingSwitch
      label="Verified profiles only"
      hint="Hide profiles that haven't been verified"
      value={value}
      onValueChange={onValueChange}
    />
  );
}
