import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  configureProvider,
  type OAuthProviderName,
} from '@/modules/project-settings/api/configure-provider'
import { listProviders } from '@/modules/project-settings/api/list-providers'
import { configureOAuthRedirects } from '@/modules/project-settings/api/configure-oauth-redirects'
import { removeProvider } from '@/modules/project-settings/api/remove-provider'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function providersKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'oauth-providers']
}

export function useOAuthProvidersQuery(
  projectId: string,
): UseQueryResult<Schemas['ConfiguredProvider'][]> {
  return useQuery({
    queryKey: providersKey(projectId),
    queryFn: () => listProviders(projectId),
    select: (settings) => settings.providers,
  })
}

export function useOAuthSettingsQuery(
  projectId: string,
): UseQueryResult<Schemas['ConfiguredProviders']> {
  return useQuery({ queryKey: providersKey(projectId), queryFn: () => listProviders(projectId) })
}

export function useConfigureOAuthRedirectsMutation(
  projectId: string,
): UseMutationResult<void, Error, string[]> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (urls: string[]) => configureOAuthRedirects(projectId, urls),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: providersKey(projectId) }),
  })
}

type ProviderTarget = { projectId: string; provider: OAuthProviderName }

export function useConfigureProviderMutation(
  target: ProviderTarget,
): UseMutationResult<void, Error, Schemas['ProviderCredentialsBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Schemas['ProviderCredentialsBody']) =>
      configureProvider(target.projectId, target.provider, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: providersKey(target.projectId) }),
  })
}

export function useRemoveProviderMutation(
  target: ProviderTarget,
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeProvider(target.projectId, target.provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: providersKey(target.projectId) }),
  })
}
