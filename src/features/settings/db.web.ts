/**
 * Web mirror of settings storage. Single object in localStorage.
 */

import type { AppSettings, ChatMode } from '@/lib/db/schema';

const STORAGE_KEY = 'inward.app_settings.v1';

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  passcodeEnabled: false,
  biometricEnabled: false,
  defaultAiMode: 'reflective',
};

function load(): AppSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function save(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function getSettings(): Promise<AppSettings> {
  return load();
}

export async function setDefaultMode(mode: ChatMode): Promise<AppSettings> {
  const next = { ...load(), defaultAiMode: mode };
  save(next);
  return next;
}
