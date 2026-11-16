import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Withdraws a pending invitation of the project. */
export async function cancelInvitation(projectId: string, invitationId: string): Promise<void> {
  const params = { path: { project_id: projectId, invitation_id: invitationId } }
  ensureSuccess(
    await apiClient.DELETE('/platform/v1/projects/{project_id}/invitations/{invitation_id}', {
      params,
    }),
  )
}
