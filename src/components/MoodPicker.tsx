import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

export type MoodValue = 1 | 2 | 3 | 4 | 5;

type MoodOption = {
  value: MoodValue;
  emoji: string;
  label: string;
};

const MOODS: readonly MoodOption[] = [
  { value: 1, emoji: '😔', label: 'Low' },
  { value: 2, emoji: '😕', label: 'Off' },
  { value: 3, emoji: '😐', label: 'Steady' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

type MoodPickerProps = {
  value: MoodValue | null;
  onChange: (value: MoodValue) => void;
};

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
      {MOODS.map((mood) => {
        const selected = value === mood.value;
        return (
          <Pressable
            key={mood.value}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(mood.value);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Mood: ${mood.label}`}
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: selected ? colors.surface : 'transparent',
              borderWidth: 1,
              borderColor: selected ? colors.accentGold : 'transparent',
            }}
          >
            <Text variant="title" style={{ fontFamily: undefined }}>
              {mood.emoji}
            </Text>
            <Text variant="micro" color="textSecondary">
              {mood.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
