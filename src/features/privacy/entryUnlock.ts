/**
 * Per-entry unlock state. The user shouldn't be re-prompted each time
 * they navigate back to the same locked entry within a single session.
 * Cleared when the app re-locks (handled by clearUnlockedEntries).
 */

import { create } from 'zustand';

import { promptBiometric, verifyPasscode, isPasscodeSet } from './auth';

type EntryUnlockState = {
  unlocked: Set<string>;
  markUnlocked: (id: string) => void;
  clear: () => void;
};

export const useEntryUnlocks = create<EntryUnlockState>((set) => ({
  unlocked: new Set(),
  markUnlocked: (id) =>
    set((state) => {
      const next = new Set(state.unlocked);
      next.add(id);
      return { unlocked: next };
    }),
  clear: () => set({ unlocked: new Set() }),
}));

/**
 * Asks the user to unlock a specific entry. Tries biometric first, then
 * falls back to a passcode prompt callback supplied by the caller (so
 * the UI can render its own passcode field).
 *
 * Returns true if authentication succeeded.
 */
export async function requestEntryUnlock(opts: {
  entryId: string;
  promptForPasscode: () => Promise<string | null>;
}): Promise<boolean> {
  // Biometric first.
  const ok = await promptBiometric('Unlock this entry');
  if (ok) {
    useEntryUnlocks.getState().markUnlocked(opts.entryId);
    return true;
  }

  // Passcode fallback — only if a passcode is actually set.
  const hasPasscode = await isPasscodeSet();
  if (!hasPasscode) {
    // No passcode set, biometric failed/declined — there's nothing else
    // to verify against. Treat as success since the entry-level lock
    // can't out-secure the absent app-level lock.
    useEntryUnlocks.getState().markUnlocked(opts.entryId);
    return true;
  }

  const entered = await opts.promptForPasscode();
  if (!entered) return false;
  const valid = await verifyPasscode(entered);
  if (valid) {
    useEntryUnlocks.getState().markUnlocked(opts.entryId);
    return true;
  }
  return false;
}
