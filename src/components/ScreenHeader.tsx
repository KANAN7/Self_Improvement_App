import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

type ScreenHeaderProps = {
  title?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
};

export function ScreenHeader({
  title,
  showBack = false,
  rightSlot,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {showBack ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
          >
            <Text variant="body" color="textSecondary">
              ←
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flex: 2, alignItems: 'center' }}>
        {title ? (
          <Text variant="caption" color="textSecondary">
            {title}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, alignItems: 'flex-end' }}>{rightSlot}</View>
    </View>
  );
}

export const headerColors = colors;
