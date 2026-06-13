import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

type SwitchProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function Switch({ label, description, value, onChange }: SwitchProps) {
  const toggle = () => {
    void Haptics.selectionAsync();
    onChange(!value);
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body">{label}</Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: value ? colors.accentSage : colors.surface,
          padding: 3,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: radius.pill,
            backgroundColor: colors.textPrimary,
          }}
        />
      </View>
    </Pressable>
  );
}
