/**
 * Echo back the user's most recent reflection on the home screen — either
 * their newest non-locked diary entry or their newest thought, whichever
 * is more recent. Calm "I see you" gesture; not a feed.
 */

import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components';
import { useDiaryEntries } from '@/features/diary';
import { useThoughts } from '@/features/thoughts';
import type { DiaryEntry, Thought } from '@/lib/db/schema';
import { spacing } from '@/theme';

type EchoSource =
  | { kind: 'entry'; entry: DiaryEntry }
  | { kind: 'thought'; thought: Thought };

export function LastEcho() {
  const router = useRouter();
  const { data: entries = [] } = useDiaryEntries();
  const { data: thoughts = [] } = useThoughts();

  const newestEntry = entries.find((e) => !e.isLocked);
  const newestThought = thoughts[0];

  let source: EchoSource | null = null;
  if (newestEntry && newestThought) {
    source =
      newestEntry.createdAt.getTime() >= newestThought.createdAt.getTime()
        ? { kind: 'entry', entry: newestEntry }
        : { kind: 'thought', thought: newestThought };
  } else if (newestEntry) {
    source = { kind: 'entry', entry: newestEntry };
  } else if (newestThought) {
    source = { kind: 'thought', thought: newestThought };
  }

  if (!source) return null;

  if (source.kind === 'entry') {
    const entry = source.entry;
    const preview = entry.content.trim().split('\n')[0]?.slice(0, 140) ?? '';
    return (
      <Pressable
        onPress={() => router.push(`/diary/${entry.id}`)}
        accessibilityRole="button"
        accessibilityLabel="Open last entry"
      >
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="micro" color="textSecondary">
              {timeAgo(entry.createdAt)} · diary
            </Text>
            <Text
              variant="body"
              family="journal"
              color="textPrimary"
              numberOfLines={2}
              style={{ lineHeight: 22, fontStyle: 'italic' }}
            >
              "{preview}"
            </Text>
          </View>
        </Card>
      </Pressable>
    );
  }

  const thought = source.thought;
  return (
    <Pressable
      onPress={() => router.push(`/thoughts/${thought.id}`)}
      accessibilityRole="button"
      accessibilityLabel="Open last thought"
    >
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text variant="micro" color="textSecondary">
            {timeAgo(thought.createdAt)} · {thought.type}
          </Text>
          <Text
            variant="body"
            color="textPrimary"
            numberOfLines={2}
            style={{ lineHeight: 22, fontStyle: 'italic' }}
          >
            "{thought.content.trim().slice(0, 140)}"
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function timeAgo(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
