import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'ghost';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  fullWidth = true,
  onPress,
  disabled,
  ...rest
}: ButtonProps) {
  const handlePress: PressableProps['onPress'] = (event) => {
    if (disabled) return;
    void Haptics.selectionAsync();
    onPress?.(event);
  };

  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? colors.accentGold : 'transparent',
        borderRadius: radius.pill,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.textSecondary,
      })}
      {...rest}
    >
      <Text
        variant="body"
        family="bodyMedium"
        color={isPrimary ? 'bg' : 'textPrimary'}
      >
        {label}
      </Text>
    </Pressable>
  );
}
