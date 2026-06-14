/**
 * Calm skeleton placeholder. Subtle pulse, no spinning. Used in place of
 * "Loading…" text on lists. The pulse uses the native driver so it's
 * cheap and doesn't block scroll on slower devices.
 */

import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type SkeletonBlockProps = {
  height?: number;
  width?: ViewStyle['width'];
  style?: ViewStyle;
};

export function SkeletonBlock({
  height = 14,
  width = '100%',
  style,
}: SkeletonBlockProps) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          backgroundColor: colors.surface,
          borderRadius: radius.sm,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/**
 * Pre-composed skeleton for an entry/thought/vault card row.
 */
export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <SkeletonBlock height={10} width="35%" />
      <SkeletonBlock height={14} width="92%" />
      <SkeletonBlock height={14} width="80%" />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
