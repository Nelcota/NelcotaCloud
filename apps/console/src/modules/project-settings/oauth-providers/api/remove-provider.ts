import type { OAuthProvider } from '@nelcota/sdk'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Stops offering login with this provider; its credentials are deleted. */
export async function removeProvider(projectId: string, provider: OAuthProvider): Promise<void> {
  const params = { path: { provider } }
  const headers = projectHeaders(projectId)
  ensureSuccess(await apiClient.DELETE('/auth/v1/admin/oauth/{provider}', { params, headers }))
}
