import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import type { ThoughtType } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

const TYPES: { value: ThoughtType; label: string }[] = [
  { value: 'realization', label: 'Realization' },
  { value: 'idea', label: 'Idea' },
  { value: 'observation', label: 'Observation' },
  { value: 'question', label: 'Question' },
  { value: 'gratitude', label: 'Gratitude' },
  { value: 'other', label: 'Other' },
];

type TypeChipsProps = {
  value: ThoughtType;
  onChange: (value: ThoughtType) => void;
};

export function TypeChips({ value, onChange }: TypeChipsProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
      }}
    >
      {TYPES.map((type) => {
        const selected = type.value === value;
        return (
          <Pressable
            key={type.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(type.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={type.label}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.accentSage : colors.surface,
            }}
          >
            <Text
              variant="caption"
              color={selected ? 'bg' : 'textSecondary'}
            >
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const THOUGHT_TYPES = TYPES;
