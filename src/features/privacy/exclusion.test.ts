/**
 * Phase 8 acceptance test: AI-exclusion is enforced. Entries marked
 * `aiExcluded` or `isLocked` MUST be filtered out by every context
 * builder before payloads reach the backend. CLAUDE.md §4 + §8.
 */

import { describe, expect, it } from 'vitest';

import { buildAnalyzeContext } from '@/features/diary/context';
import { buildChatContext } from '@/features/chat/context';
import type { DiaryEntry, Thought } from '@/lib/db/schema';

const NOW = new Date('2026-06-14T12:00:00Z');

function entry(partial: Partial<DiaryEntry> & { id: string; content: string }): DiaryEntry {
  return {
    id: partial.id,
    content: partial.content,
    mood: partial.mood ?? null,
    energy: partial.energy ?? null,
    focus: partial.focus ?? null,
    whatHelped: partial.whatHelped ?? null,
    aiExcluded: partial.aiExcluded ?? false,
    isLocked: partial.isLocked ?? false,
    aiSummary: partial.aiSummary ?? null,
    aiQuestion: partial.aiQuestion ?? null,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

function thought(partial: Partial<Thought> & { id: string; content: string }): Thought {
  return {
    id: partial.id,
    content: partial.content,
    type: partial.type ?? 'other',
    aiExcluded: partial.aiExcluded ?? false,
    linkedEntryId: partial.linkedEntryId ?? null,
    createdAt: partial.createdAt ?? NOW,
  };
}

describe('buildAnalyzeContext', () => {
  it('excludes entries marked ai_excluded', () => {
    const visible = entry({ id: 'a', content: 'visible thing' });
    const hidden = entry({ id: 'b', content: 'SECRET TEXT', aiExcluded: true });
    const result = buildAnalyzeContext([hidden, visible], undefined, NOW);
    expect(result).toContain('visible thing');
    expect(result).not.toContain('SECRET TEXT');
  });

  it('excludes entries marked is_locked', () => {
    const visible = entry({ id: 'a', content: 'visible thing' });
    const hidden = entry({ id: 'b', content: 'LOCKED TEXT', isLocked: true });
    const result = buildAnalyzeContext([hidden, visible], undefined, NOW);
    expect(result).toContain('visible thing');
    expect(result).not.toContain('LOCKED TEXT');
  });

  it('excludes the entry being analyzed by id', () => {
    const target = entry({ id: 'self', content: 'TARGET' });
    const other = entry({ id: 'other', content: 'OTHER' });
    const result = buildAnalyzeContext([target, other], 'self', NOW);
    expect(result).toContain('OTHER');
    expect(result).not.toContain('TARGET');
  });
});

describe('buildChatContext', () => {
  const today = new Date('2026-06-14T12:00:00Z');
  const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twentyDaysAgo = new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000);

  it('excludes ai_excluded entries', () => {
    const visible = entry({ id: 'a', content: 'visible diary', createdAt: oneDayAgo });
    const hidden = entry({
      id: 'b',
      content: 'SECRET DIARY',
      aiExcluded: true,
      createdAt: oneDayAgo,
    });
    const result = buildChatContext({
      entries: [visible, hidden],
      thoughts: [],
      now: today,
    });
    expect(result).toContain('visible diary');
    expect(result).not.toContain('SECRET DIARY');
  });

  it('excludes is_locked entries', () => {
    const visible = entry({ id: 'a', content: 'visible diary', createdAt: oneDayAgo });
    const hidden = entry({
      id: 'b',
      content: 'LOCKED DIARY',
      isLocked: true,
      createdAt: oneDayAgo,
    });
    const result = buildChatContext({
      entries: [visible, hidden],
      thoughts: [],
      now: today,
    });
    expect(result).toContain('visible diary');
    expect(result).not.toContain('LOCKED DIARY');
  });

  it('excludes entries older than 14 days', () => {
    const recent = entry({ id: 'a', content: 'recent diary', createdAt: oneDayAgo });
    const old = entry({ id: 'b', content: 'OLD DIARY', createdAt: twentyDaysAgo });
    const result = buildChatContext({
      entries: [recent, old],
      thoughts: [],
      now: today,
    });
    expect(result).toContain('recent diary');
    expect(result).not.toContain('OLD DIARY');
  });

  it('excludes ai_excluded thoughts', () => {
    const visible = thought({ id: 't1', content: 'visible thought' });
    const hidden = thought({ id: 't2', content: 'SECRET THOUGHT', aiExcluded: true });
    const result = buildChatContext({
      entries: [],
      thoughts: [visible, hidden],
      now: today,
    });
    expect(result).toContain('visible thought');
    expect(result).not.toContain('SECRET THOUGHT');
  });
});
