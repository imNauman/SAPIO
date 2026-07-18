import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';

/**
 * Custom Slider.
 *
 * Why: React Native 0.74 removed the built-in `Slider`, and we cannot add the
 * `@react-native-community/slider` dependency (npm is blocked in this env).
 * This is a lightweight single-thumb slider built on `PanResponder` with no new
 * native deps. It reports a value in `[min, max]` (rounded to `step`).
 */
const PRIMARY = '#ff5864';
const BORDER = '#e5e7eb';
const CARD = '#ffffff';
const TEXT = '#111827';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  label?: string;
  formatValue?: (value: number) => string;
  style?: ViewStyle;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  label,
  formatValue,
  style,
}) => {
  const trackWidth = useRef(0);
  const thumbRef = useRef<View>(null);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const toFraction = (v: number) => (clamp(v) - min) / (max - min || 1);
  const fractionToValue = (f: number) =>
    clamp(Math.round((min + f * (max - min)) / step) * step);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_evt, gesture) => {
        const x = gesture.moveX;
        const f = trackWidth.current ? x / trackWidth.current : 0;
        onValueChange(fractionToValue(Math.max(0, Math.min(1, f))));
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const leftPct = `${toFraction(value) * 100}%`;

  return (
    <View style={[styles.container, style]}>
      {label !== undefined && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: TEXT }]}>{label}</Text>
          <Text style={[styles.value, { color: PRIMARY }]}>
            {formatValue ? formatValue(value) : String(value)}
          </Text>
        </View>
      )}
      <View
        style={[styles.track, { backgroundColor: BORDER }]}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        <View
          style={[styles.fill, { width: leftPct as unknown as number, backgroundColor: PRIMARY }]}
        />
        <View
          ref={thumbRef}
          style={[
            styles.thumb,
            { left: leftPct as unknown as number, backgroundColor: CARD, borderColor: PRIMARY },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '700' },
  track: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: { height: 6, borderRadius: 3, position: 'absolute', left: 0, top: 0 },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    top: -8,
    marginLeft: -11,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
