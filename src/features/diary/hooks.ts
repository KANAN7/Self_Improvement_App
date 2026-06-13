import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { DiaryEntry } from '@/lib/db/schema';

import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
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
