import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

/** The project's logo, a square JPEG; only members may read it, so it is fetched with the session. */
export async function readProjectLogo(projectId: string): Promise<Blob> {
  return dataOf(
    await apiClient.GET('/auth/v1/admin/logo', {
      headers: projectHeaders(projectId),
      parseAs: 'blob',
    }),
  )
}
