import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type AcceptedInvitation = components['schemas']['AcceptedInvitation']

/** Joins the project the invitation is for. */
export async function acceptInvitation(invitationId: string): Promise<AcceptedInvitation> {
  const params = { path: { invitation_id: invitationId } }

  return dataOf(await apiClient.POST('/platform/v1/invitations/{invitation_id}/accept', { params }))
}
