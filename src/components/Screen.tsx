import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = ViewProps & {
  children: ReactNode;
  /** Horizontal padding token (default `lg` = 24px). */
  padded?: boolean;
  edges?: readonly Edge[];
};

export function Screen({
  children,
  padded = true,
  edges = ['top', 'bottom'],
  style,
  ...rest
}: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView
        edges={edges}
        style={[
          {
            flex: 1,
            paddingHorizontal: padded ? spacing.lg : 0,
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}
