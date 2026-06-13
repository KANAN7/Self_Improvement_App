/**
 * Builds the recent-entries context block sent to /ai/analyze. Strict
 * client-side filtering enforces the privacy rule: entries with
 * `aiExcluded` or `isLocked` set never reach the backend.
 */

import type { DiaryEntry } from '@/lib/db/schema';
import { formatEntryDate } from '@/lib/date';

const ANALYZE_CONTEXT_SIZE = 5;

export function buildAnalyzeContext(
  allEntries: DiaryEntry[],
  excludeId: string | undefined,
  now: Date = new Date(),
): string {
  const filtered = allEntries.filter(
    (entry) =>
      entry.id !== excludeId && !entry.aiExcluded && !entry.isLocked,
  );
  // allEntries comes back newest-first from the DB; we want oldest-first
  // for chronological reading by the model.
  const recent = filtered.slice(0, ANALYZE_CONTEXT_SIZE).reverse();

  if (recent.length === 0) return '';

  return recent
    .map((entry) => {
      const dateLabel = formatEntryDate(entry.createdAt, now);
      const stats: string[] = [];
      if (entry.mood != null) stats.push(`mood ${entry.mood}/5`);
      if (entry.energy != null) stats.push(`energy ${entry.energy}/5`);
      if (entry.focus != null) stats.push(`focus ${entry.focus}/5`);
      const head = stats.length ? `[${dateLabel} · ${stats.join(', ')}]` : `[${dateLabel}]`;
      return `${head}\n${entry.content.trim()}`;
    })
    .join('\n\n');
}
