import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type ThoughtType =
  | 'realization'
  | 'idea'
  | 'observation'
  | 'question'
  | 'gratitude'
  | 'other';

export type VaultContentType = 'youtube' | 'article' | 'podcast' | 'reel' | 'other';

export type VaultCategory =
  | 'motivation'
  | 'spirituality'
  | 'mental_health'
  | 'focus'
  | 'identity'
  | 'other';

export type ChatRole = 'user' | 'assistant';
export type ChatMode = 'reflective' | 'coach' | 'direct';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const diaryEntries = sqliteTable('diary_entries', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  mood: integer('mood'),
  energy: integer('energy'),
  focus: integer('focus'),
  whatHelped: text('what_helped'),
  aiExcluded: integer('ai_excluded', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  aiSummary: text('ai_summary'),
  aiQuestion: text('ai_question'),
  ...timestamps,
});

export const thoughts = sqliteTable('thoughts', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type').$type<ThoughtType>().notNull().default('other'),
  aiExcluded: integer('ai_excluded', { mode: 'boolean' }).notNull().default(false),
  linkedEntryId: text('linked_entry_id').references(() => diaryEntries.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const vaultItems = sqliteTable('vault_items', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  thumbnailUrl: text('thumbnail_url'),
  contentType: text('content_type').$type<VaultContentType>().notNull().default('other'),
  category: text('category').$type<VaultCategory>().notNull().default('other'),
  whySaved: text('why_saved'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  role: text('role').$type<ChatRole>().notNull(),
  content: text('content').notNull(),
  mode: text('mode').$type<ChatMode>().notNull().default('reflective'),
  contextBasis: text('context_basis'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Single-row settings table. Always read/write the row with id = 1.
 */
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  passcodeEnabled: integer('passcode_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  biometricEnabled: integer('biometric_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  defaultAiMode: text('default_ai_mode').$type<ChatMode>().notNull().default('reflective'),
});

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;
export type Thought = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;
export type VaultItem = typeof vaultItems.$inferSelect;
export type NewVaultItem = typeof vaultItems.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
