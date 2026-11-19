import type { OAuthProvider } from '@nelcota/sdk'

import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ProviderCredentialsBody = components['schemas']['ProviderCredentialsBody']

/** Login with the project's own Google or GitHub OAuth app. */
export async function configureProvider(
  projectId: string,
  provider: OAuthProvider,
  body: ProviderCredentialsBody,
): Promise<void> {
  const params = { path: { provider } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.PUT('/auth/v1/admin/oauth/{provider}', { params, body, headers }))
}
