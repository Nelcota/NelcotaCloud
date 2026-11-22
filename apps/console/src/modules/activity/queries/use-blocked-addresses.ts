import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { blockAddress } from '@/modules/activity/api/block-address'
import { listBlockedAddresses } from '@/modules/activity/api/list-blocked-addresses'
import { unblockAddress } from '@/modules/activity/api/unblock-address'
import { auditEventsKey } from '@/modules/activity/queries/use-audit-events-query'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function blockedAddressesKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'blocked-addresses']
}

export function useBlockedAddressesQuery(
  projectId: string,
): UseQueryResult<Schemas['BlockedAddress'][]> {
  return useQuery({
    queryKey: blockedAddressesKey(projectId),
    queryFn: () => listBlockedAddresses(projectId),
  })
}

export function useBlockAddressMutation(
  projectId: string,
): UseMutationResult<Schemas['BlockedAddress'], Error, Schemas['BlockAddressBody']> {
  const refresh = useBlocksRefresh(projectId)

  return useMutation({
    mutationFn: (body: Schemas['BlockAddressBody']) => blockAddress(projectId, body),
    onSuccess: refresh,
  })
}

export function useUnblockAddressMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  const refresh = useBlocksRefresh(projectId)

  return useMutation({
    mutationFn: (blockId: string) => unblockAddress(projectId, blockId),
    onSuccess: refresh,
  })
}

/** The list changed, and the log gained an `address_blocked` or `address_unblocked` event. */
function useBlocksRefresh(projectId: string): () => Promise<void> {
  const queryClient = useQueryClient()

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: blockedAddressesKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) }),
    ])
  }
}
