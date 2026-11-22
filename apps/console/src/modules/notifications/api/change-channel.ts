import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type ChannelEvents = {
  channelId: string
  events: components['schemas']['NotificationEvent'][]
}

/** Replaces the events the channel receives. */
export async function changeChannel(
  projectId: string,
  change: ChannelEvents,
): Promise<NotificationChannel> {
  const headers = projectHeaders(projectId)
  const params = { path: { channel_id: change.channelId } }
  const body = { events: change.events }
  const path = '/auth/v1/admin/notifications/{channel_id}'

  return dataOf(await apiClient.PATCH(path, { headers, params, body }))
}
