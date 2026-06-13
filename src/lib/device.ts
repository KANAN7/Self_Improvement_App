/**
 * Stable per-device id used as the X-Device-Id header for backend rate
 * limiting. Generated once and persisted. Native uses expo-secure-store;
 * web falls back to localStorage (it's a non-secret throwaway id).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { newId } from './id';

const KEY = 'inward.device_id.v1';

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      const existing = localStorage.getItem(KEY);
      if (existing) {
        cached = existing;
        return existing;
      }
      const fresh = newId();
      localStorage.setItem(KEY, fresh);
      cached = fresh;
      return fresh;
    }
    // Non-browser web (SSR) — generate ephemeral id
    const ephemeral = newId();
    cached = ephemeral;
    return ephemeral;
  }

  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = newId();
  await SecureStore.setItemAsync(KEY, fresh);
  cached = fresh;
  return fresh;
}
