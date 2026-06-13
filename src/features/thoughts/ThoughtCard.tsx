import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components';
import type { Thought } from '@/lib/db/schema';
import { spacing } from '@/theme';

import { THOUGHT_TYPES } from './TypeChips';

const TYPE_LABEL: Record<Thought['type'], string> = Object.fromEntries(
  THOUGHT_TYPES.map((t) => [t.value, t.label]),
) as Record<Thought['type'], string>;

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

type ThoughtCardProps = {
  thought: Thought;
  onPress?: () => void;
};

export function ThoughtCard({ thought, onPress }: ThoughtCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Thought: ${TYPE_LABEL[thought.type]}`}
    >
      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.sm,
          }}
        >
          <Text variant="micro" color="accentSage">
            {TYPE_LABEL[thought.type]}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            {thought.linkedEntryId ? (
              <Text variant="micro" color="textSecondary">
                ↗ entry
              </Text>
            ) : null}
            {thought.aiExcluded ? (
              <Text variant="micro" color="textSecondary">
                private
              </Text>
            ) : null}
            <Text variant="micro" color="textSecondary">
              {timeAgo(thought.createdAt)}
            </Text>
          </View>
        </View>
        <Text variant="body" numberOfLines={4}>
          {thought.content}
        </Text>
      </Card>
    </Pressable>
  );
}
