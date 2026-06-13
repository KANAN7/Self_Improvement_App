/**
 * Web implementation of diary CRUD using localStorage. Metro picks this file
 * over `db.ts` when building for web (`.web.ts` extension wins).
 *
 * The shape of each export must match `db.ts` exactly so callers don't care
 * which platform they're on.
 */

import type { DiaryEntry } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type DiaryEntryInput = {
  content: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  whatHelped: string | null;
  aiExcluded: boolean;
  isLocked: boolean;
};

const STORAGE_KEY = 'inward.diary_entries.v1';

type StoredEntry = Omit<DiaryEntry, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

function loadAll(): StoredEntry[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAll(rows: StoredEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function hydrate(row: StoredEntry): DiaryEntry {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function listEntries(): Promise<DiaryEntry[]> {
  return loadAll()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(hydrate);
}

export async function getEntry(id: string): Promise<DiaryEntry | undefined> {
  const found = loadAll().find((row) => row.id === id);
  return found ? hydrate(found) : undefined;
}

export async function createEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
  const now = Date.now();
  const row: StoredEntry = {
    id: newId(),
    content: input.content,
    mood: input.mood,
    energy: input.energy,
    focus: input.focus,
    whatHelped: input.whatHelped,
    aiExcluded: input.aiExcluded,
    isLocked: input.isLocked,
    aiSummary: null,
    aiQuestion: null,
    createdAt: now,
    updatedAt: now,
  };
  const all = loadAll();
  all.push(row);
  saveAll(all);
  return hydrate(row);
}

export async function updateEntry(
  id: string,
  input: DiaryEntryInput,
): Promise<DiaryEntry> {
  const all = loadAll();
  const idx = all.findIndex((row) => row.id === id);
  if (idx === -1) throw new Error(`Diary entry not found: ${id}`);
  const existing = all[idx]!;
  const updated: StoredEntry = {
    ...existing,
    content: input.content,
    mood: input.mood,
    energy: input.energy,
    focus: input.focus,
    whatHelped: input.whatHelped,
    aiExcluded: input.aiExcluded,
    isLocked: input.isLocked,
    updatedAt: Date.now(),
  };
  all[idx] = updated;
  saveAll(all);
  return hydrate(updated);
}

export async function deleteEntry(id: string): Promise<void> {
  const all = loadAll().filter((row) => row.id !== id);
  saveAll(all);
}
