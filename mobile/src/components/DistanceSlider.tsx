import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Slider } from './Slider';

/**
 * DistanceSlider — single-thumb slider for the discovery radius.
 *
 * Why: The discovery radius is a single value (km). Free users are capped at
 * 100km server-side; Premium is unlimited. We surface the cap to the UI so the
 * slider's max reflects the caller's tier, and show "100+ km" when the value
 * hits the free cap. Reuses the existing `Slider` — no new native deps.
 */
interface DistanceSliderProps {
  value: number;
  max: number;
  onValueChange: (value: number) => void;
  /** When true, values at/above the cap are shown as unlimited. */
  isPremium?: boolean;
}

export function DistanceSlider({
  value,
  max,
  onValueChange,
  isPremium = false,
}: DistanceSliderProps) {
  const displayMax = isPremium ? Math.max(max, 200) : Math.min(max, 100);
  return (
    <View style={styles.container}>
      <Slider
        label="Maximum distance"
        value={Math.min(value, displayMax)}
        min={1}
        max={displayMax}
        onValueChange={onValueChange}
        formatValue={(v) =>
          isPremium
            ? v >= displayMax
              ? `${displayMax}+ km`
              : `${v} km`
            : v >= 100
              ? '100+ km'
              : `${v} km`
        }
      />
      {!isPremium && (
        <Text style={styles.note}>
          Free accounts are limited to 100 km. Go Premium for unlimited range.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  note: { fontSize: 12, color: '#8a8a8e', marginTop: 4, paddingHorizontal: 2 },
});
