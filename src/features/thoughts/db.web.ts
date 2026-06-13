/**
 * Web implementation of thoughts CRUD using localStorage. Metro picks this
 * file over `db.ts` when building for web (`.web.ts` extension wins).
 */

import type { Thought, ThoughtType } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type ThoughtInput = {
  content: string;
  type: ThoughtType;
  aiExcluded: boolean;
  linkedEntryId: string | null;
};

const STORAGE_KEY = 'inward.thoughts.v1';

type StoredThought = Omit<Thought, 'createdAt'> & {
  createdAt: number;
};

function loadAll(): StoredThought[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredThought[]) : [];
  } catch {
    return [];
  }
}

function saveAll(rows: StoredThought[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function hydrate(row: StoredThought): Thought {
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function listThoughts(query?: string): Promise<Thought[]> {
  const all = loadAll();
  const filtered =
    query && query.trim()
      ? all.filter((row) =>
          row.content.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : all;
  return filtered
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(hydrate);
}

export async function getThought(id: string): Promise<Thought | undefined> {
  const found = loadAll().find((row) => row.id === id);
  return found ? hydrate(found) : undefined;
}

export async function createThought(input: ThoughtInput): Promise<Thought> {
  const row: StoredThought = {
    id: newId(),
    content: input.content,
    type: input.type,
    aiExcluded: input.aiExcluded,
    linkedEntryId: input.linkedEntryId,
    createdAt: Date.now(),
  };
  const all = loadAll();
  all.push(row);
  saveAll(all);
  return hydrate(row);
}

export async function updateThought(id: string, input: ThoughtInput): Promise<Thought> {
  const all = loadAll();
  const idx = all.findIndex((row) => row.id === id);
  if (idx === -1) throw new Error(`Thought not found: ${id}`);
  const existing = all[idx]!;
  const updated: StoredThought = {
    ...existing,
    content: input.content,
    type: input.type,
    aiExcluded: input.aiExcluded,
    linkedEntryId: input.linkedEntryId,
  };
  all[idx] = updated;
  saveAll(all);
  return hydrate(updated);
}

export async function deleteThought(id: string): Promise<void> {
  const all = loadAll().filter((row) => row.id !== id);
  saveAll(all);
}
