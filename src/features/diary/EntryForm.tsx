import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  MoodPicker,
  Slider,
  Switch,
  Text,
  TextInput,
  type MoodValue,
} from '@/components';
import { spacing } from '@/theme';

import type { DiaryEntryInput } from './db';

export type EntryFormValues = DiaryEntryInput;

type EntryFormProps = {
  initial?: Partial<EntryFormValues>;
  submitLabel: string;
  onSubmit: (values: EntryFormValues) => void;
  isSubmitting?: boolean;
};

export function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  isSubmitting,
}: EntryFormProps) {
  const [content, setContent] = useState(initial?.content ?? '');
  const [mood, setMood] = useState<MoodValue | null>(
    (initial?.mood as MoodValue | null | undefined) ?? null,
  );
  const [energy, setEnergy] = useState<number>(initial?.energy ?? 3);
  const [focus, setFocus] = useState<number>(initial?.focus ?? 3);
  const [whatHelped, setWhatHelped] = useState(initial?.whatHelped ?? '');
  const [aiExcluded, setAiExcluded] = useState(initial?.aiExcluded ?? false);
  const [isLocked, setIsLocked] = useState(initial?.isLocked ?? false);

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      content: content.trim(),
      mood: mood,
      energy,
      focus,
      whatHelped: whatHelped.trim() ? whatHelped.trim() : null,
      aiExcluded,
      isLocked,
    });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Reflection
        </Text>
        <TextInput
          journal
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="How did today go?"
          autoFocus={!initial?.content}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          Mood
        </Text>
        <MoodPicker value={mood} onChange={setMood} />
      </View>

      <Slider label="Energy" value={energy} onChange={(v) => setEnergy(Math.round(v))} />
      <Slider label="Focus" value={focus} onChange={(v) => setFocus(Math.round(v))} />

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" color="textSecondary">
          What helped today?
        </Text>
        <TextInput
          value={whatHelped}
          onChangeText={setWhatHelped}
          placeholder="Optional"
        />
      </View>

      <Switch
        label="Keep private"
        description="Excluded from AI context."
        value={aiExcluded}
        onChange={setAiExcluded}
      />

      <Switch
        label="Lock this entry"
        description="Requires biometric or passcode to view."
        value={isLocked}
        onChange={setIsLocked}
      />

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </View>
  );
}
