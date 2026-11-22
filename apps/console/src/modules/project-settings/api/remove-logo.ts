import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function removeLogo(projectId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/auth/v1/admin/logo', { headers: projectHeaders(projectId) }),
  )
}
