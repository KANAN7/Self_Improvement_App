import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { VaultItem } from '@/lib/db/schema';

import {
  createVaultItem,
  deleteVaultItem,
  getVaultItem,
  listVaultItems,
  updateVaultItem,
  type VaultItemInput,
} from './db';

const VAULT_KEY = ['vault'] as const;
const vaultItemKey = (id: string) => ['vault', 'item', id] as const;

export function useVaultItems(): UseQueryResult<VaultItem[]> {
  return useQuery({ queryKey: VAULT_KEY, queryFn: listVaultItems });
}

export function useVaultItem(id: string | undefined): UseQueryResult<VaultItem | undefined> {
  return useQuery({
    queryKey: id ? vaultItemKey(id) : ['vault', 'item', 'none'],
    queryFn: () => (id ? getVaultItem(id) : Promise.resolve(undefined)),
    enabled: Boolean(id),
  });
}

export function useCreateVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VaultItemInput) => createVaultItem(input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: VAULT_KEY });
      qc.setQueryData(vaultItemKey(row.id), row);
    },
  });
}

export function useUpdateVaultItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VaultItemInput) => updateVaultItem(id, input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: VAULT_KEY });
      qc.setQueryData(vaultItemKey(row.id), row);
    },
  });
}

export function useDeleteVaultItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVaultItem(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: VAULT_KEY });
      qc.removeQueries({ queryKey: vaultItemKey(id) });
    },
  });
}
