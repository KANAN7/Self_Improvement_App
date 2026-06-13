import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { Thought } from '@/lib/db/schema';

import {
  createThought,
  deleteThought,
  getThought,
  listThoughts,
  updateThought,
  type ThoughtInput,
} from './db';

const THOUGHTS_KEY = ['thoughts'] as const;
const thoughtsListKey = (query: string) => ['thoughts', 'list', query] as const;
const thoughtKey = (id: string) => ['thoughts', 'item', id] as const;

export function useThoughts(query: string = ''): UseQueryResult<Thought[]> {
  return useQuery({
    queryKey: thoughtsListKey(query),
    queryFn: () => listThoughts(query),
  });
}

export function useThought(id: string | undefined): UseQueryResult<Thought | undefined> {
  return useQuery({
    queryKey: id ? thoughtKey(id) : ['thoughts', 'item', 'none'],
    queryFn: () => (id ? getThought(id) : Promise.resolve(undefined)),
    enabled: Boolean(id),
  });
}

export function useCreateThought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ThoughtInput) => createThought(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: THOUGHTS_KEY });
      qc.setQueryData(thoughtKey(row.id), row);
    },
  });
}

export function useUpdateThought(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ThoughtInput) => updateThought(id, input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: THOUGHTS_KEY });
      qc.setQueryData(thoughtKey(row.id), row);
    },
  });
}

export function useDeleteThought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteThought(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: THOUGHTS_KEY });
      qc.removeQueries({ queryKey: thoughtKey(id) });
    },
  });
}
