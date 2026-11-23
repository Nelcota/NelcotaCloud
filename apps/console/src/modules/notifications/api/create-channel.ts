import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type NewChannel = components['schemas']['NewChannelBody']

/** Adds an email address or a Discord or Slack webhook; the API seals the destination. */
export async function createChannel(
  projectId: string,
  channel: NewChannel,
): Promise<NotificationChannel> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/auth/v1/admin/notifications', { headers, body: channel }))
}
