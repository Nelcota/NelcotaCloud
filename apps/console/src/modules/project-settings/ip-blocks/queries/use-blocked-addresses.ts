import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  blockAddress,
  listBlockedAddresses,
  unblockAddress,
} from '@/modules/project-settings/ip-blocks/api/blocked-addresses'
import type { components } from '@/shared/api/api-schema'
import { auditEventsKey } from '@/shared/lib/audit-events-key'

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

/** Both change the list and add an event to the activity log. */
function useRefreshAfterChange(projectId: string): () => Promise<void> {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({ queryKey: blockedAddressesKey(projectId) })
    await queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
  }
}

export function useBlockAddressMutation(
  projectId: string,
): UseMutationResult<Schemas['BlockedAddress'], Error, Schemas['BlockAddressBody']> {
  const refresh = useRefreshAfterChange(projectId)

  return useMutation({ mutationFn: (body) => blockAddress(projectId, body), onSuccess: refresh })
}

export function useUnblockAddressMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  const refresh = useRefreshAfterChange(projectId)

  return useMutation({
    mutationFn: (blockId) => unblockAddress(projectId, blockId),
    onSuccess: refresh,
  })
}
