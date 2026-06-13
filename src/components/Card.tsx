import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type CardProps = ViewProps & {
  children: ReactNode;
};

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
