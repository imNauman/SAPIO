import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slider } from './Slider';

/**
 * AgeRangeSlider — two single-thumb sliders (min + max) for the age band.
 *
 * Why: The Discovery age filter is a range, but the app's `Slider` is
 * single-thumb (no multi-thumb dep available). We compose two `Slider`s with
 * cross-constraints: min cannot exceed max and vice-versa. The engine scores
 * (not hard-filters) age, so a small overlap is harmless, but we keep min<=max
 * for a sane UI. Reuses the existing `Slider` — no new native deps.
 */
interface AgeRangeSliderProps {
  minimumAge: number;
  maximumAge: number;
  minBound?: number;
  maxBound?: number;
  onMinimumChange: (value: number) => void;
  onMaximumChange: (value: number) => void;
}

export function AgeRangeSlider({
  minimumAge,
  maximumAge,
  minBound = 18,
  maxBound = 99,
  onMinimumChange,
  onMaximumChange,
}: AgeRangeSliderProps) {
  return (
    <View style={styles.container}>
      <Slider
        label="Minimum age"
        value={minimumAge}
        min={minBound}
        max={maximumAge}
        onValueChange={(v) => onMinimumChange(Math.min(v, maximumAge))}
        formatValue={(v) => String(v)}
      />
      <Slider
        label="Maximum age"
        value={maximumAge}
        min={minimumAge}
        max={maxBound}
        onValueChange={(v) => onMaximumChange(Math.max(v, minimumAge))}
        formatValue={(v) => String(v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
});
