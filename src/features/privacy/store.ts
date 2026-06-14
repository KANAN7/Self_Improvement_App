/**
 * App-level lock state. Synchronous, ephemeral. The persisted decision
 * "is a passcode set?" lives in expo-secure-store; this store just tracks
 * whether the current session has been unlocked.
 */

import { create } from 'zustand';

export type LockState = {
  /** Whether the gate has been resolved (passcode-set check done). */
  ready: boolean;
  /** Whether a passcode exists at all. */
  passcodeSet: boolean;
  /** Whether biometric is configured + enabled. */
  biometricEnabled: boolean;
  /** True when the user has authenticated this session. */
  unlocked: boolean;

  setReady: (info: { passcodeSet: boolean; biometricEnabled: boolean }) => void;
  setPasscodeSet: (value: boolean) => void;
  setBiometricEnabled: (value: boolean) => void;
  unlock: () => void;
  lock: () => void;
};

export const useLock = create<LockState>((set) => ({
  ready: false,
  passcodeSet: false,
  biometricEnabled: false,
  unlocked: false,

  setReady: ({ passcodeSet, biometricEnabled }) =>
    set({
      ready: true,
      passcodeSet,
      biometricEnabled,
      // No passcode set = always unlocked.
      unlocked: !passcodeSet,
    }),
  setPasscodeSet: (value) =>
    set((s) => ({
      passcodeSet: value,
      unlocked: value ? s.unlocked : true,
    })),
  setBiometricEnabled: (value) => set({ biometricEnabled: value }),
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}));
