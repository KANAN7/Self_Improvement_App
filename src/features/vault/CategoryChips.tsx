import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import type { VaultCategory } from '@/lib/db/schema';
import { colors, radius, spacing } from '@/theme';

const CATEGORIES: { value: VaultCategory; label: string }[] = [
  { value: 'motivation', label: 'Motivation' },
  { value: 'spirituality', label: 'Spirituality' },
  { value: 'mental_health', label: 'Mental health' },
  { value: 'focus', label: 'Focus' },
  { value: 'identity', label: 'Identity' },
  { value: 'other', label: 'Other' },
];

type CategoryChipsProps = {
  value: VaultCategory;
  onChange: (value: VaultCategory) => void;
};

export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
      }}
    >
      {CATEGORIES.map((category) => {
        const selected = category.value === value;
        return (
          <Pressable
            key={category.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(category.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={category.label}
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
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const VAULT_CATEGORIES = CATEGORIES;
