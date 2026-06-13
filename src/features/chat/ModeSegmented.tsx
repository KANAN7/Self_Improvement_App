import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import type { ChatMode } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

const MODES: { value: ChatMode; label: string }[] = [
  { value: 'reflective', label: 'Reflective' },
  { value: 'coach', label: 'Coach' },
  { value: 'direct', label: 'Direct' },
];

type ModeSegmentedProps = {
  value: ChatMode;
  onChange: (value: ChatMode) => void;
  disabled?: boolean;
};

export function ModeSegmented({ value, onChange, disabled }: ModeSegmentedProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.pill,
        padding: 4,
        gap: 4,
      }}
    >
      {MODES.map((mode) => {
        const selected = mode.value === value;
        return (
          <Pressable
            key={mode.value}
            onPress={() => {
              if (disabled || selected) return;
              void Haptics.selectionAsync();
              onChange(mode.value);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
            accessibilityLabel={`${mode.label} mode`}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.accentSage : 'transparent',
              alignItems: 'center',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <Text
              variant="caption"
              color={selected ? 'bg' : 'textSecondary'}
              family={selected ? 'bodyMedium' : 'body'}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
