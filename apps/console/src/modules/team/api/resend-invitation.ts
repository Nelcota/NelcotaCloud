import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type PendingInvitation = components['schemas']['PendingInvitation']

export async function resendInvitation(
  projectId: string,
  invitationId: string,
): Promise<PendingInvitation> {
  const params = { path: { project_id: projectId, invitation_id: invitationId } }

  return dataOf(
    await apiClient.POST('/platform/v1/projects/{project_id}/invitations/{invitation_id}/resend', {
      params,
    }),
  )
}
