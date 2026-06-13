import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { chatMessages, type ChatMessage, type ChatMode, type ChatRole } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type NewChatMessageInput = {
  role: ChatRole;
  content: string;
  mode: ChatMode;
  contextBasis: string | null;
};

export async function listMessages(): Promise<ChatMessage[]> {
  // Chat reads chronologically, so sort ascending here.
  return db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
}

export async function appendMessage(input: NewChatMessageInput): Promise<ChatMessage> {
  const [row] = await db
    .insert(chatMessages)
    .values({
      id: newId(),
      role: input.role,
      content: input.content,
      mode: input.mode,
      contextBasis: input.contextBasis,
      createdAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to insert chat message');
  return row;
}

export async function updateMessage(
  id: string,
  patch: { content?: string; contextBasis?: string | null },
): Promise<ChatMessage> {
  const [row] = await db
    .update(chatMessages)
    .set({
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.contextBasis !== undefined ? { contextBasis: patch.contextBasis } : {}),
    })
    .where(eq(chatMessages.id, id))
    .returning();
  if (!row) throw new Error(`Chat message not found: ${id}`);
  return row;
}

export async function clearMessages(): Promise<void> {
  await db.delete(chatMessages);
}
