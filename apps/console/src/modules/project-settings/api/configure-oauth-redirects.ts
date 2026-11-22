import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function configureOAuthRedirects(projectId: string, urls: string[]): Promise<void> {
  const headers = projectHeaders(projectId)
  const body = { redirect_urls: urls }

  ensureSuccess(await apiClient.PUT('/auth/v1/admin/oauth/redirects', { headers, body }))
}
