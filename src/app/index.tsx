import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { LastEcho, MoodTrend } from '@/features/home';
import { useOnboarding } from '@/features/onboarding';
import { timeAwareGreeting } from '@/lib/date';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const greeting = timeAwareGreeting();
  const onboarded = useOnboarding((s) => s.onboarded);
  const onboardingReady = useOnboarding((s) => s.ready);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (onboardingReady && !onboarded) {
      router.replace('/onboarding');
    }
  }, [onboarded, onboardingReady, router]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  // Don't flash the home screen for someone about to be redirected.
  if (onboardingReady && !onboarded) return null;

  return (
    <Screen>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" color="textSecondary">
              {greeting}
            </Text>
            <Text variant="display" color="textPrimary">
              Inward
            </Text>
            <Text variant="caption" color="textSecondary">
              If you want to, you will.
            </Text>
          </View>

          <LastEcho />

          <View style={{ alignItems: 'center', marginVertical: spacing.sm }}>
            <MoodTrend />
          </View>

          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            <Button
              label="Reflect"
              onPress={() => router.push('/diary')}
              fullWidth={false}
            />
            <Button
              label="Thoughts"
              variant="ghost"
              onPress={() => router.push('/thoughts')}
              fullWidth={false}
            />
            <Button
              label="Vault"
              variant="ghost"
              onPress={() => router.push('/vault')}
              fullWidth={false}
            />
            <Button
              label="Talk to companion"
              variant="ghost"
              onPress={() => router.push('/chat')}
              fullWidth={false}
            />
          </View>

          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={12}
            >
              <Text variant="caption" color="textSecondary">
                Settings
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Screen>
  );
}
