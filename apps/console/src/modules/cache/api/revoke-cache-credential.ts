import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export async function revokeCacheCredential(
  projectId: string,
  credentialId: string,
): Promise<void> {
  const params = { path: { project_id: projectId, credential_id: credentialId } }
  ensureSuccess(
    await apiClient.DELETE('/platform/v1/projects/{project_id}/cache/credentials/{credential_id}', {
      params,
    }),
  )
}
