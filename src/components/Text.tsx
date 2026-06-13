import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fontFamilies, typeScale, type TypeVariant } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypeVariant;
  family?: keyof typeof fontFamilies;
  color?: keyof typeof colors;
};

export function Text({
  variant = 'body',
  family,
  color = 'textPrimary',
  style,
  children,
  ...rest
}: TextProps) {
  const resolvedFamily =
    family ?? (variant === 'display' || variant === 'title' ? 'display' : 'body');

  return (
    <RNText
      style={[
        {
          color: colors[color],
          fontFamily: fontFamilies[resolvedFamily],
          ...typeScale[variant],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
