import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

type PlusButtonProps = {
  onPress: () => void;
  /** Override the accessibility label, e.g. "New entry" / "New thought". */
  accessibilityLabel?: string;
};

export function PlusButton({
  onPress,
  accessibilityLabel = 'Add',
}: PlusButtonProps) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({
        backgroundColor: colors.accentGold,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="body" family="bodyMedium" color="bg">
        +
      </Text>
    </Pressable>
  );
}
