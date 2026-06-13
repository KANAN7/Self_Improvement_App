import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  vaultItems,
  type VaultCategory,
  type VaultContentType,
  type VaultItem,
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

export async function listVaultItems(): Promise<VaultItem[]> {
  return db.select().from(vaultItems).orderBy(desc(vaultItems.createdAt));
}

export async function getVaultItem(id: string): Promise<VaultItem | undefined> {
  const rows = await db.select().from(vaultItems).where(eq(vaultItems.id, id)).limit(1);
  return rows[0];
}

export async function createVaultItem(input: VaultItemInput): Promise<VaultItem> {
  const [row] = await db
    .insert(vaultItems)
    .values({
      id: newId(),
      url: input.url,
      title: input.title,
      thumbnailUrl: input.thumbnailUrl,
      contentType: input.contentType,
      category: input.category,
      whySaved: input.whySaved,
      createdAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('Failed to create vault item');
  return row;
}

export async function updateVaultItem(
  id: string,
  input: VaultItemInput,
): Promise<VaultItem> {
  const [row] = await db
    .update(vaultItems)
    .set({
      url: input.url,
      title: input.title,
      thumbnailUrl: input.thumbnailUrl,
      contentType: input.contentType,
      category: input.category,
      whySaved: input.whySaved,
    })
    .where(eq(vaultItems.id, id))
    .returning();
  if (!row) throw new Error(`Vault item not found: ${id}`);
  return row;
}

export async function deleteVaultItem(id: string): Promise<void> {
  await db.delete(vaultItems).where(eq(vaultItems.id, id));
}
