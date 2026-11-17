import { apiClient } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Declines an invitation sent to the console account. */
export async function declineInvitation(invitationId: string): Promise<void> {
  const params = { path: { invitation_id: invitationId } }
  ensureSuccess(await apiClient.DELETE('/platform/v1/invitations/{invitation_id}', { params }))
}
