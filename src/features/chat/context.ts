/**
 * Builds the recent-context block for /ai/chat. Last 14 days of
 * non-excluded, non-locked diary entries + last 20 thoughts. Strict
 * client-side filtering enforces the privacy rule.
 */

import { formatEntryDate } from '@/lib/date';
import type { DiaryEntry, Thought } from '@/lib/db/schema';

const CHAT_ENTRY_DAYS = 14;
const CHAT_THOUGHT_LIMIT = 20;

export function buildChatContext(input: {
  entries: DiaryEntry[];
  thoughts: Thought[];
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const cutoff = now.getTime() - CHAT_ENTRY_DAYS * 24 * 60 * 60 * 1000;

  const recentEntries = input.entries
    .filter(
      (entry) =>
        !entry.aiExcluded &&
        !entry.isLocked &&
        entry.createdAt.getTime() >= cutoff,
    )
    .slice() // already newest-first; reverse for chronological reading
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const recentThoughts = input.thoughts
    .filter((t) => !t.aiExcluded)
    .slice(0, CHAT_THOUGHT_LIMIT)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const sections: string[] = [];

  if (recentEntries.length > 0) {
    sections.push('Recent diary entries (oldest first):');
    sections.push(
      recentEntries
        .map((entry) => {
          const dateLabel = formatEntryDate(entry.createdAt, now);
          const stats: string[] = [];
          if (entry.mood != null) stats.push(`mood ${entry.mood}/5`);
          if (entry.energy != null) stats.push(`energy ${entry.energy}/5`);
          if (entry.focus != null) stats.push(`focus ${entry.focus}/5`);
          const head = stats.length
            ? `[${dateLabel} · ${stats.join(', ')}]`
            : `[${dateLabel}]`;
          return `${head}\n${entry.content.trim()}`;
        })
        .join('\n\n'),
    );
  }

  if (recentThoughts.length > 0) {
    sections.push('Recent thoughts:');
    sections.push(
      recentThoughts
        .map((thought) => `- (${thought.type}) ${thought.content.trim()}`)
        .join('\n'),
    );
  }

  return sections.join('\n\n');
}
