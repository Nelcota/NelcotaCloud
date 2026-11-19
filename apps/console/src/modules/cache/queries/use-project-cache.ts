import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { changeCacheSettings } from '@/modules/cache/api/change-cache-settings'
import { clearProjectCache } from '@/modules/cache/api/clear-project-cache'
import { createCacheCredential } from '@/modules/cache/api/create-cache-credential'
import { readCacheSettings } from '@/modules/cache/api/read-cache-settings'
import { revokeCacheCredential } from '@/modules/cache/api/revoke-cache-credential'
import { projectDataKey } from '@/modules/projects/queries/project-catalog-key'
import type { components } from '@/shared/api/api-schema'

type Settings = components['schemas']['ProjectCacheSettings']
type IssuedCredential = components['schemas']['IssuedCacheCredential']

function cacheQueryKey(projectId: string): readonly string[] {
  return [...projectDataKey(projectId), 'cache']
}

export function useProjectCacheQuery(projectId: string): UseQueryResult<Settings> {
  return useQuery({
    queryKey: cacheQueryKey(projectId),
    queryFn: () => readCacheSettings(projectId),
  })
}

export function useChangeCacheSettings(projectId: string): UseMutationResult<void, Error, boolean> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) => changeCacheSettings(projectId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheQueryKey(projectId) }),
  })
}

export function useClearProjectCache(projectId: string): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => clearProjectCache(projectId) })
}

export function useCreateCacheCredential(
  projectId: string,
  onIssued: (credential: IssuedCredential) => void,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string): Promise<void> => {
      onIssued(await createCacheCredential(projectId, name))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheQueryKey(projectId) }),
  })
}

export function useRevokeCacheCredential(
  projectId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => revokeCacheCredential(projectId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cacheQueryKey(projectId) }),
  })
}
