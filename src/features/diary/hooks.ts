import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { analyzeEntry, AiError } from '@/lib/ai/client';
import type { DiaryEntry } from '@/lib/db/schema';

import { buildAnalyzeContext } from './context';
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  setAiObservation,
  updateEntry,
  type DiaryEntryInput,
} from './db';

const DIARY_KEY = ['diary', 'entries'] as const;
const diaryEntryKey = (id: string) => ['diary', 'entries', id] as const;

export function useDiaryEntries(): UseQueryResult<DiaryEntry[]> {
  return useQuery({
    queryKey: DIARY_KEY,
    queryFn: listEntries,
  });
}

export function useDiaryEntry(id: string | undefined): UseQueryResult<DiaryEntry | undefined> {
  return useQuery({
    queryKey: id ? diaryEntryKey(id) : ['diary', 'entries', 'none'],
    queryFn: () => (id ? getEntry(id) : Promise.resolve(undefined)),
    enabled: Boolean(id),
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiaryEntryInput) => createEntry(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: DIARY_KEY });
      qc.setQueryData(diaryEntryKey(row.id), row);
    },
  });
}

export function useUpdateEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DiaryEntryInput) => updateEntry(id, input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: DIARY_KEY });
      qc.setQueryData(diaryEntryKey(row.id), row);
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: DIARY_KEY });
      qc.removeQueries({ queryKey: diaryEntryKey(id) });
    },
  });
}

/**
 * Fire-and-forget analyzer. Caller invokes `mutate(entry)` and walks away;
 * the cache is updated when the observation lands. Errors are silent —
 * an entry without an observation just looks like an entry without an
 * observation.
 */
export type AnalyzePending = {
  /** Entry id currently being analyzed, if any. */
  pendingId: string | null;
  /** Why the latest call didn't produce an observation (if it failed). */
  lastSkipReason: AiError['reason'] | null;
};

const ANALYZE_MUTATION_KEY = ['diary', 'analyze'] as const;

export function useAnalyzeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ANALYZE_MUTATION_KEY,
    mutationFn: async (entry: DiaryEntry) => {
      if (entry.aiExcluded || entry.isLocked) {
        return { entry, skipped: true as const, reason: null };
      }
      const allEntries = qc.getQueryData<DiaryEntry[]>(DIARY_KEY) ?? [];
      const recentContext = buildAnalyzeContext(allEntries, entry.id);
      try {
        const result = await analyzeEntry({
          entry: {
            content: entry.content,
            mood: entry.mood,
            energy: entry.energy,
            focus: entry.focus,
          },
          recentContext,
        });
        const updated = await setAiObservation(entry.id, {
          summary: result.summary,
          question: result.question,
        });
        return { entry: updated ?? entry, skipped: false as const, reason: null };
      } catch (err) {
        const reason = err instanceof AiError ? err.reason : 'failed';
        return {
          entry,
          skipped: true as const,
          reason,
        };
      }
    },
    onSuccess: ({ entry }) => {
      qc.invalidateQueries({ queryKey: DIARY_KEY });
      qc.setQueryData(diaryEntryKey(entry.id), entry);
    },
  });
}

/**
 * Set of diary entry ids currently being analyzed. Used by list/edit
 * screens to show a "Reflecting…" placeholder while we wait.
 */
export function useAnalyzingIds(): Set<string> {
  const pending = useMutationState({
    filters: { mutationKey: ANALYZE_MUTATION_KEY, status: 'pending' },
    select: (m) => (m.state.variables as DiaryEntry | undefined)?.id,
  });
  return new Set(pending.filter((id): id is string => Boolean(id)));
}
