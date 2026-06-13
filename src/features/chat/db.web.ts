/**
 * Web implementation of chat message storage. Mirrors db.ts shape.
 */

import type { ChatMessage, ChatMode, ChatRole } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type NewChatMessageInput = {
  role: ChatRole;
  content: string;
  mode: ChatMode;
  contextBasis: string | null;
};

const STORAGE_KEY = 'inward.chat_messages.v1';

type StoredMessage = Omit<ChatMessage, 'createdAt'> & { createdAt: number };

function loadAll(): StoredMessage[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredMessage[]) : [];
  } catch {
    return [];
  }
}

function saveAll(rows: StoredMessage[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function hydrate(row: StoredMessage): ChatMessage {
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function listMessages(): Promise<ChatMessage[]> {
  return loadAll()
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(hydrate);
}

export async function appendMessage(input: NewChatMessageInput): Promise<ChatMessage> {
  const row: StoredMessage = {
    id: newId(),
    role: input.role,
    content: input.content,
    mode: input.mode,
    contextBasis: input.contextBasis,
    createdAt: Date.now(),
  };
  const all = loadAll();
  all.push(row);
  saveAll(all);
  return hydrate(row);
}

export async function updateMessage(
  id: string,
  patch: { content?: string; contextBasis?: string | null },
): Promise<ChatMessage> {
  const all = loadAll();
  const idx = all.findIndex((row) => row.id === id);
  if (idx === -1) throw new Error(`Chat message not found: ${id}`);
  const existing = all[idx]!;
  const updated: StoredMessage = {
    ...existing,
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    ...(patch.contextBasis !== undefined ? { contextBasis: patch.contextBasis } : {}),
  };
  all[idx] = updated;
  saveAll(all);
  return hydrate(updated);
}

export async function clearMessages(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
