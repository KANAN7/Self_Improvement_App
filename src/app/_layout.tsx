import '../global.css';

import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useOnboarding } from '@/features/onboarding';
import {
  isBiometricEnabled,
  isPasscodeSet,
  LockGate,
  useEntryUnlocks,
  useLock,
} from '@/features/privacy';
import { initializeDatabase } from '@/lib/db';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.bg);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Lora_400Regular,
    Lora_600SemiBold,
  });

  const lockReady = useLock((s) => s.ready);
  const lockUnlocked = useLock((s) => s.unlocked);
  const setLockReady = useLock((s) => s.setReady);
  const clearEntryUnlocks = useEntryUnlocks((s) => s.clear);
  const onboardingReady = useOnboarding((s) => s.ready);
  const resolveOnboarding = useOnboarding((s) => s.resolve);

  useEffect(() => {
    try {
      initializeDatabase();
      setDbReady(true);
    } catch (error) {
      console.error('Failed to initialize database', error);
      setDbReady(true);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [passcodeSet, biometricEnabled] = await Promise.all([
        isPasscodeSet(),
        isBiometricEnabled(),
      ]);
      setLockReady({ passcodeSet, biometricEnabled });
      // App start = fresh session = wipe any stale per-entry unlocks.
      clearEntryUnlocks();
    })();
  }, [setLockReady, clearEntryUnlocks]);

  useEffect(() => {
    void resolveOnboarding();
  }, [resolveOnboarding]);

  useEffect(() => {
    if (fontsLoaded && dbReady && lockReady && onboardingReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady, lockReady, onboardingReady]);

  if (!fontsLoaded || !dbReady || !lockReady || !onboardingReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          {lockUnlocked ? (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade',
              }}
            />
          ) : (
            <LockGate />
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
