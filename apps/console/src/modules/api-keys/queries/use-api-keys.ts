import {
  type UseMutationResult,
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'

import { createApiKey } from '@/modules/api-keys/api/create-api-key'
import { listApiKeys } from '@/modules/api-keys/api/list-api-keys'
import { revokeApiKey } from '@/modules/api-keys/api/revoke-api-key'
import { rotateSigningKey } from '@/modules/api-keys/api/rotate-signing-key'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']
type ApiKeyKind = Schemas['ApiKeyKind']

function apiKeysQueryKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'api-keys']
}

function apiKeyPages(projectId: string) {
  return infiniteQueryOptions({
    queryKey: apiKeysQueryKey(projectId),
    queryFn: ({ pageParam }) => listApiKeys(projectId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  })
}

export function useApiKeysQuery(projectId: string) {
  return useInfiniteQuery({
    ...apiKeyPages(projectId),
    select: (data) => data.pages.at(0)?.keys ?? [],
  })
}

export function useApiKeysHistoryQuery(projectId: string) {
  return useInfiniteQuery({
    ...apiKeyPages(projectId),
    select: (data) => data.pages.flatMap((page) => page.keys),
  })
}

export function useCreateApiKeyMutation(
  projectId: string,
): UseMutationResult<Schemas['IssuedApiKey'], Error, { kind: ApiKeyKind; name: string }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: { kind: ApiKeyKind; name: string }) => createApiKey(projectId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) }),
  })
}

export function useRevokeApiKeyMutation(projectId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (keyId: string) => revokeApiKey(projectId, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey(projectId) }),
  })
}

export function useRotateSigningKeyMutation(
  projectId: string,
): UseMutationResult<Schemas['RotatedSigningKey'], Error, void> {
  return useMutation({
    mutationKey: signingKeyRotationKey(projectId),
    mutationFn: () => rotateSigningKey(projectId),
  })
}

function signingKeyRotationKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'signing-key-rotation']
}

/**
 * When the signing key was last rotated from this console session, as an ISO date; the API
 * does not report rotation dates, so `null` until someone rotates here.
 */
export function useLastSigningKeyRotation(projectId: string): string | null {
  const rotations = useMutationState({
    filters: { mutationKey: signingKeyRotationKey(projectId), status: 'success' },
    select: (mutation) => mutation.state.submittedAt,
  })
  const latest = Math.max(0, ...rotations)

  if (latest === 0) {
    return null
  }

  return new Date(latest).toISOString()
}
