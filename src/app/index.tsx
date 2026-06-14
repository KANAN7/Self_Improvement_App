import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { timeAwareGreeting } from '@/lib/date';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const greeting = timeAwareGreeting();

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
        <Text variant="caption" color="textSecondary">
          {greeting}
        </Text>
        <Text variant="display" color="textPrimary">
          Inward
        </Text>
        <Text
          variant="caption"
          color="textSecondary"
          style={{ textAlign: 'center', marginBottom: spacing.xl }}
        >
          If you want to, you will.
        </Text>
        <View style={{ gap: spacing.md, alignSelf: 'stretch', alignItems: 'center' }}>
          <Button
            label="Reflect"
            onPress={() => router.push('/diary')}
            fullWidth={false}
          />
          <Button
            label="Capture a thought"
            variant="ghost"
            onPress={() => router.push('/thoughts/new')}
            fullWidth={false}
          />
          <Button
            label="Save a link"
            variant="ghost"
            onPress={() => router.push('/vault/new')}
            fullWidth={false}
          />
          <Button
            label="Talk to companion"
            variant="ghost"
            onPress={() => router.push('/chat')}
            fullWidth={false}
          />
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={12}
          style={{ marginTop: spacing.xl }}
        >
          <Text variant="caption" color="textSecondary">
            Settings
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
