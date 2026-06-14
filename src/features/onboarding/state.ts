/**
 * Tracks whether the user has completed the first-launch onboarding flow.
 * Stored in expo-secure-store on native; localStorage on web (it's a
 * non-secret boolean — a clean profile should see onboarding again).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

const KEY = 'inward.onboarded.v1';

async function readFlag(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(KEY) === '1';
  }
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

async function writeFlag(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, '1');
    return;
  }
  await SecureStore.setItemAsync(KEY, '1');
}

type OnboardingState = {
  ready: boolean;
  onboarded: boolean;
  resolve: () => Promise<void>;
  markComplete: () => Promise<void>;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  ready: false,
  onboarded: false,
  resolve: async () => {
    const value = await readFlag();
    set({ ready: true, onboarded: value });
  },
  markComplete: async () => {
    await writeFlag();
    set({ onboarded: true });
  },
}));
