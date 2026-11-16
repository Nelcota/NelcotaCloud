import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
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

export function useApiKeysQuery(projectId: string): UseQueryResult<Schemas['ApiKeySummary'][]> {
  return useQuery({ queryKey: apiKeysQueryKey(projectId), queryFn: () => listApiKeys(projectId) })
}

export function useCreateApiKeyMutation(
  projectId: string,
): UseMutationResult<Schemas['IssuedApiKey'], Error, ApiKeyKind> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (kind: ApiKeyKind) => createApiKey(projectId, { kind }),
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
  return useMutation({ mutationFn: () => rotateSigningKey(projectId) })
}
