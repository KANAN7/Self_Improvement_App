import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type * as schema from './schema';

export const db: ExpoSQLiteDatabase<typeof schema>;
export function initializeDatabase(): void;
