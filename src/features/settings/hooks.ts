import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppSettings, ChatMode } from '@/lib/db/schema';

import { getSettings, setDefaultMode } from './db';

const SETTINGS_KEY = ['settings'] as const;

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: SETTINGS_KEY,
    queryFn: getSettings,
  });
}

export function useSetDefaultMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: ChatMode) => setDefaultMode(mode),
    onSuccess: (row) => {
      qc.setQueryData(SETTINGS_KEY, row);
    },
  });
}
