/**
 * Auth primitives for app-level lock and per-entry lock.
 *
 * Passcode is stored as SHA-256(salt + passcode) in expo-secure-store.
 * The salt is generated once and stored alongside the hash. We don't
 * roll a real KDF (Argon2 etc.) — the threat model is "someone briefly
 * picks up an unlocked phone," not "someone exfiltrates the SecureStore
 * blob and runs offline brute force." If that ever changes, swap the
 * hash function here without touching callers.
 */

import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PASSCODE_HASH_KEY = 'inward.passcode_hash.v1';
const PASSCODE_SALT_KEY = 'inward.passcode_salt.v1';
const BIOMETRIC_ENABLED_KEY = 'inward.biometric_enabled.v1';

// expo-secure-store doesn't run on web. We fall back to localStorage
// because the web build is dev/preview only — see KNOWLEDGE.md.
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}
async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function hashPasscode(passcode: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${passcode}`,
  );
}

export async function isPasscodeSet(): Promise<boolean> {
  const hash = await getItem(PASSCODE_HASH_KEY);
  return Boolean(hash);
}

export async function setPasscode(passcode: string): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await hashPasscode(passcode, salt);
  await setItem(PASSCODE_SALT_KEY, salt);
  await setItem(PASSCODE_HASH_KEY, hash);
}

export async function clearPasscode(): Promise<void> {
  await removeItem(PASSCODE_HASH_KEY);
  await removeItem(PASSCODE_SALT_KEY);
  await removeItem(BIOMETRIC_ENABLED_KEY);
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const [salt, expected] = await Promise.all([
    getItem(PASSCODE_SALT_KEY),
    getItem(PASSCODE_HASH_KEY),
  ]);
  if (!salt || !expected) return false;
  const actual = await hashPasscode(passcode, salt);
  return constantTimeEq(actual, expected);
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// --- biometric ----------------------------------------------------------

export type BiometricCapability = {
  hardwarePresent: boolean;
  enrolled: boolean;
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return { hardwarePresent: false, enrolled: false };
  }
  const [hardwarePresent, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return { hardwarePresent, enrolled };
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await getItem(BIOMETRIC_ENABLED_KEY)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await setItem(BIOMETRIC_ENABLED_KEY, '1');
  else await removeItem(BIOMETRIC_ENABLED_KEY);
}

export async function promptBiometric(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      // Don't allow device passcode fallback here — we want OUR passcode,
      // not the OS one, so the lock state is consistent.
      disableDeviceFallback: true,
      cancelLabel: 'Use passcode',
    });
    return result.success;
  } catch {
    return false;
  }
}
