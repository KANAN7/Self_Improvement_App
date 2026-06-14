/**
 * Builds a single JSON export of all user data. Includes everything
 * (entries, thoughts, vault items, chat messages, settings) per the
 * decision in Phase 8 — the user can prune later if they want.
 *
 * Passcode hash and biometric flags are intentionally NOT included; an
 * export is meant to be sharable (cloud drive, email-to-self) without
 * leaking auth secrets.
 */

import { listEntries } from '@/features/diary/db';
import { listMessages as listChatMessages } from '@/features/chat/db';
import { getSettings } from '@/features/settings/db';
import { listThoughts } from '@/features/thoughts/db';
import { listVaultItems } from '@/features/vault/db';

const EXPORT_SCHEMA_VERSION = 1;

export type InwardExport = {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  app: 'inward';
  entries: unknown[];
  thoughts: unknown[];
  vaultItems: unknown[];
  chatMessages: unknown[];
  settings: { defaultAiMode: string };
};

export async function buildExport(): Promise<InwardExport> {
  const [entries, thoughts, vaultItems, chatMessages, settings] = await Promise.all([
    listEntries(),
    listThoughts(),
    listVaultItems(),
    listChatMessages(),
    getSettings(),
  ]);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'inward',
    entries,
    thoughts,
    vaultItems,
    chatMessages,
    settings: { defaultAiMode: settings.defaultAiMode },
  };
}

export function exportFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `inward-export-${yyyy}-${mm}-${dd}.json`;
}
