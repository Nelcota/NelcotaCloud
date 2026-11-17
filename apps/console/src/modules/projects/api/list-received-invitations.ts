import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type ReceivedInvitation = components['schemas']['ReceivedInvitation']

/** Invitations sent to the console account's email. */
export async function listReceivedInvitations(): Promise<ReceivedInvitation[]> {
  return dataOf(await apiClient.GET('/platform/v1/invitations'))
}
