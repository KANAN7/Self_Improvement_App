/**
 * Web implementation of vault CRUD using localStorage. Metro picks this
 * file over `db.ts` when building for web.
 */

import type {
  VaultCategory,
  VaultContentType,
  VaultItem,
} from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type VaultItemInput = {
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  contentType: VaultContentType;
  category: VaultCategory;
  whySaved: string | null;
};

const STORAGE_KEY = 'inward.vault_items.v1';

type StoredItem = Omit<VaultItem, 'createdAt'> & {
  createdAt: number;
};

function loadAll(): StoredItem[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredItem[]) : [];
  } catch {
    return [];
  }
}

function saveAll(rows: StoredItem[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function hydrate(row: StoredItem): VaultItem {
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function listVaultItems(): Promise<VaultItem[]> {
  return loadAll()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(hydrate);
}

export async function getVaultItem(id: string): Promise<VaultItem | undefined> {
  const found = loadAll().find((row) => row.id === id);
  return found ? hydrate(found) : undefined;
}

export async function createVaultItem(input: VaultItemInput): Promise<VaultItem> {
  const row: StoredItem = {
    id: newId(),
    url: input.url,
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    contentType: input.contentType,
    category: input.category,
    whySaved: input.whySaved,
    createdAt: Date.now(),
  };
  const all = loadAll();
  all.push(row);
  saveAll(all);
  return hydrate(row);
}

export async function updateVaultItem(
  id: string,
  input: VaultItemInput,
): Promise<VaultItem> {
  const all = loadAll();
  const idx = all.findIndex((row) => row.id === id);
  if (idx === -1) throw new Error(`Vault item not found: ${id}`);
  const existing = all[idx]!;
  const updated: StoredItem = {
    ...existing,
    url: input.url,
    title: input.title,
    thumbnailUrl: input.thumbnailUrl,
    contentType: input.contentType,
    category: input.category,
    whySaved: input.whySaved,
  };
  all[idx] = updated;
  saveAll(all);
  return hydrate(updated);
}

export async function deleteVaultItem(id: string): Promise<void> {
  const all = loadAll().filter((row) => row.id !== id);
  saveAll(all);
}
