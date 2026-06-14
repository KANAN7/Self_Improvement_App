/**
 * First-launch philosophy flow. Three short principles, then "Begin".
 * Persisted via useOnboarding so it never appears again unless local
 * storage is cleared. Skippable from any screen.
 */

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useOnboarding } from '@/features/onboarding';
import { colors, radius, spacing } from '@/theme';

const PAGES = [
  {
    title: 'Inward',
    body: 'A space to think out loud.\nWhatever you write stays on this device.',
  },
  {
    title: 'Three voices.',
    body: 'Reflective. Coach. Direct.\nPick the one that feels right today.',
  },
  {
    title: 'No streaks. No nudges.',
    body: 'Just you, when you choose to come back.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const markComplete = useOnboarding((s) => s.markComplete);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [index, fade]);

  const finish = async () => {
    await markComplete();
    router.replace('/');
  };

  const next = () => {
    if (index < PAGES.length - 1) {
      setIndex(index + 1);
    } else {
      void finish();
    }
  };

  const skip = () => {
    void finish();
  };

  const page = PAGES[index]!;
  const isLast = index === PAGES.length - 1;

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          {!isLast ? (
            <Pressable onPress={skip} accessibilityRole="button" hitSlop={12}>
              <Text variant="caption" color="textSecondary">
                Skip
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Animated.View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: fade,
            gap: spacing.lg,
          }}
        >
          <Text
            variant="display"
            color="textPrimary"
            style={{ textAlign: 'center' }}
          >
            {page.title}
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            style={{ textAlign: 'center', lineHeight: 26 }}
          >
            {page.body}
          </Text>
        </Animated.View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor:
                  i === index ? colors.accentSage : colors.surface,
              }}
            />
          ))}
        </View>

        <Button label={isLast ? 'Begin' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}
