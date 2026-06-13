import { desc, eq, like } from 'drizzle-orm';

import { db } from '@/lib/db';
import { thoughts, type Thought, type ThoughtType } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export type ThoughtInput = {
  content: string;
  type: ThoughtType;
  aiExcluded: boolean;
  linkedEntryId: string | null;
};

export async function listThoughts(query?: string): Promise<Thought[]> {
  if (query && query.trim()) {
    return db
      .select()
      .from(thoughts)
      .where(like(thoughts.content, `%${query.trim()}%`))
      .orderBy(desc(thoughts.createdAt));
  }
  return db.select().from(thoughts).orderBy(desc(thoughts.createdAt));
}

export async function getThought(id: string): Promise<Thought | undefined> {
  const rows = await db.select().from(thoughts).where(eq(thoughts.id, id)).limit(1);
  return rows[0];
}

export async function createThought(input: ThoughtInput): Promise<Thought> {
  const [row] = await db
    .insert(thoughts)
    .values({
      id: newId(),
      content: input.content,
      type: input.type,
      aiExcluded: input.aiExcluded,
      linkedEntryId: input.linkedEntryId,
      createdAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to create thought');
  return row;
}

export async function updateThought(id: string, input: ThoughtInput): Promise<Thought> {
  const [row] = await db
    .update(thoughts)
    .set({
      content: input.content,
      type: input.type,
      aiExcluded: input.aiExcluded,
      linkedEntryId: input.linkedEntryId,
    })
    .where(eq(thoughts.id, id))
    .returning();
  if (!row) throw new Error(`Thought not found: ${id}`);
  return row;
}

export async function deleteThought(id: string): Promise<void> {
  await db.delete(thoughts).where(eq(thoughts.id, id));
}
