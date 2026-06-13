import { View } from 'react-native';

import { Screen, Text } from '@/components';
import { spacing } from '@/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text variant="display" color="textPrimary">
          Inward
        </Text>
        <Text
          variant="caption"
          color="textSecondary"
          style={{ textAlign: 'center' }}
        >
          If you want to, you will.
        </Text>
      </View>
    </Screen>
  );
}
