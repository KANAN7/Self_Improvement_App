/**
 * Quiet 7-day mood trend on the home screen. One dot per day, oldest left.
 * Color reflects the dominant mood that day; empty days show a hollow dot.
 *
 * No numbers, no axes, no average. Just "did you check in, and how did
 * it feel" at a glance.
 */

import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { useDiaryEntries } from '@/features/diary';
import type { DiaryEntry } from '@/lib/db/schema';
import { colors, spacing } from '@/theme';

const DAYS = 7;

const MOOD_COLOR: Record<number, string> = {
  1: colors.moodRose, // 😔
  2: colors.moodRose,
  3: colors.moodSlate,
  4: colors.moodSage,
  5: colors.moodAmber, // 😊
};

const DAY_LABEL = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat (US) — used cyclically

type DayCell = {
  date: Date;
  label: string;
  mood: number | null;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDays(now: Date, entries: DiaryEntry[]): DayCell[] {
  const today = startOfDay(now);
  // Map "yyyy-mm-dd" -> average mood (so two entries on the same day blend).
  const moodByDay = new Map<string, { sum: number; count: number }>();
  for (const entry of entries) {
    if (entry.mood == null || entry.isLocked) continue;
    const day = startOfDay(entry.createdAt);
    const key = day.toISOString().slice(0, 10);
    const existing = moodByDay.get(key) ?? { sum: 0, count: 0 };
    existing.sum += entry.mood;
    existing.count += 1;
    moodByDay.set(key, existing);
  }

  const cells: DayCell[] = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const sample = moodByDay.get(key);
    const mood = sample ? Math.round(sample.sum / sample.count) : null;
    cells.push({
      date: day,
      label: DAY_LABEL[day.getDay()] ?? '·',
      mood,
    });
  }
  return cells;
}

export function MoodTrend() {
  const { data: entries = [] } = useDiaryEntries();
  const cells = buildDays(new Date(), entries);
  const filled = cells.some((c) => c.mood != null);

  return (
    <View
      style={{
        gap: spacing.xs,
        alignItems: 'center',
      }}
    >
      <Text variant="micro" color="textSecondary">
        Last 7 days
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {cells.map((cell, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <Pressable
              accessibilityRole="text"
              accessibilityLabel={
                cell.mood == null
                  ? `${cell.date.toDateString()}: no entry`
                  : `${cell.date.toDateString()}: mood ${cell.mood} of 5`
              }
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: cell.mood != null ? MOOD_COLOR[cell.mood] : 'transparent',
                borderWidth: cell.mood != null ? 0 : 1,
                borderColor: colors.surface,
              }}
            />
            <Text variant="micro" color="textSecondary">
              {cell.label.toLowerCase()}
            </Text>
          </View>
        ))}
      </View>
      {!filled ? (
        <Text variant="micro" color="textSecondary" style={{ opacity: 0.7 }}>
          A week of entries fills these in.
        </Text>
      ) : null}
    </View>
  );
}
