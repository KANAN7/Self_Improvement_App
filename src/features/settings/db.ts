import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { appSettings, type AppSettings, type ChatMode } from '@/lib/db/schema';

const SETTINGS_ID = 1;

export async function getSettings(): Promise<AppSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // Bootstrap should have inserted this in initializeDatabase. Insert
    // defensively if missing.
    const [inserted] = await db.insert(appSettings).values({ id: SETTINGS_ID }).returning();
    if (!inserted) throw new Error('Failed to create default settings');
    return inserted;
  }
  return row;
}

export async function setDefaultMode(mode: ChatMode): Promise<AppSettings> {
  await getSettings(); // ensure row exists
  const [row] = await db
    .update(appSettings)
    .set({ defaultAiMode: mode })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning();
  if (!row) throw new Error('Failed to update settings');
  return row;
}
