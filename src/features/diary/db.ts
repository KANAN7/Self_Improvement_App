import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { diaryEntries, type DiaryEntry } from '@/lib/db/schema';
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

export async function listEntries(): Promise<DiaryEntry[]> {
  return db.select().from(diaryEntries).orderBy(desc(diaryEntries.createdAt));
}

export async function getEntry(id: string): Promise<DiaryEntry | undefined> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.id, id))
    .limit(1);
  return rows[0];
}

export async function createEntry(input: DiaryEntryInput): Promise<DiaryEntry> {
  const id = newId();
  const now = new Date();
  const [row] = await db
    .insert(diaryEntries)
    .values({
      id,
      content: input.content,
      mood: input.mood,
      energy: input.energy,
      focus: input.focus,
      whatHelped: input.whatHelped,
      aiExcluded: input.aiExcluded,
      isLocked: input.isLocked,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new Error('Failed to create diary entry');
  return row;
}

export async function updateEntry(
  id: string,
  input: DiaryEntryInput,
): Promise<DiaryEntry> {
  const [row] = await db
    .update(diaryEntries)
    .set({
      content: input.content,
      mood: input.mood,
      energy: input.energy,
      focus: input.focus,
      whatHelped: input.whatHelped,
      aiExcluded: input.aiExcluded,
      isLocked: input.isLocked,
      updatedAt: new Date(),
    })
    .where(eq(diaryEntries.id, id))
    .returning();
  if (!row) throw new Error(`Diary entry not found: ${id}`);
  return row;
}

export async function deleteEntry(id: string): Promise<void> {
  await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
}
