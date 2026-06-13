import * as SQLite from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from './schema';

const DB_NAME = 'inward.db';

const sqlite = SQLite.openDatabaseSync(DB_NAME);

export const db: ExpoSQLiteDatabase<typeof schema> = drizzle(sqlite, { schema });

/**
 * Phase 1 bootstrap: create tables idempotently. Replace with drizzle-kit
 * migrations once we start altering schema (Phase 2+).
 */
export function initializeDatabase(): void {
  sqlite.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      mood INTEGER,
      energy INTEGER,
      focus INTEGER,
      what_helped TEXT,
      ai_excluded INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      ai_summary TEXT,
      ai_question TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS thoughts (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      ai_excluded INTEGER NOT NULL DEFAULT 0,
      linked_entry_id TEXT REFERENCES diary_entries(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      thumbnail_url TEXT,
      content_type TEXT NOT NULL DEFAULT 'other',
      category TEXT NOT NULL DEFAULT 'other',
      why_saved TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'reflective',
      context_basis TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      passcode_enabled INTEGER NOT NULL DEFAULT 0,
      biometric_enabled INTEGER NOT NULL DEFAULT 0,
      default_ai_mode TEXT NOT NULL DEFAULT 'reflective'
    );

    INSERT OR IGNORE INTO app_settings (id) VALUES (1);
  `);
}
