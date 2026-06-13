import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components';
import type { DiaryEntry } from '@/lib/db/schema';
import { formatEntryDate } from '@/lib/date';
import { colors, spacing } from '@/theme';

const MOOD_EMOJI: Record<number, string> = {
  1: '😔',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
};

type EntryCardProps = {
  entry: DiaryEntry;
  onPress?: () => void;
  isAnalyzing?: boolean;
};

export function EntryCard({ entry, onPress, isAnalyzing }: EntryCardProps) {
  const dateLabel = formatEntryDate(entry.createdAt);
  const moodGlyph = entry.mood ? MOOD_EMOJI[entry.mood] : null;
  const preview = entry.isLocked
    ? 'Locked entry'
    : entry.content.trim().split('\n')[0]?.slice(0, 140) ?? '';

  const showObservation = entry.aiSummary && !entry.isLocked && !entry.aiExcluded;
  const showAnalyzing =
    isAnalyzing && !showObservation && !entry.isLocked && !entry.aiExcluded;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Entry from ${dateLabel}`}>
      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Text variant="caption" color="textSecondary">
            {dateLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            {entry.aiExcluded ? (
              <Text variant="micro" color="textSecondary">
                private
              </Text>
            ) : null}
            {entry.isLocked ? (
              <Text variant="micro" color="textSecondary">
                🔒
              </Text>
            ) : null}
            {moodGlyph ? <Text variant="body">{moodGlyph}</Text> : null}
          </View>
        </View>
        <Text
          variant="body"
          family="journal"
          color="textPrimary"
          numberOfLines={3}
          style={{ lineHeight: 24 }}
        >
          {preview || 'Untitled entry'}
        </Text>
        {showObservation ? (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.bg,
              gap: spacing.xs,
            }}
          >
            <Text variant="caption" color="textSecondary" style={{ fontStyle: 'italic' }}>
              {entry.aiSummary}
            </Text>
            <Text variant="micro" color="textSecondary">
              ℹ Based on your recent entries
            </Text>
          </View>
        ) : showAnalyzing ? (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.bg,
            }}
          >
            <Text variant="micro" color="textSecondary">
              Reflecting…
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
