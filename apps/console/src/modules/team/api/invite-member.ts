import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type PendingInvitation = components['schemas']['PendingInvitation']

/** Invites an email to manage the project as a member; the API emails the invitation. */
export async function inviteMember(projectId: string, email: string): Promise<PendingInvitation> {
  const params = { path: { project_id: projectId } }
  const body = { email }

  return dataOf(
    await apiClient.POST('/platform/v1/projects/{project_id}/invitations', { params, body }),
  )
}
