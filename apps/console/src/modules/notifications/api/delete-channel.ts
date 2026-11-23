import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Stops sending alerts to the channel. */
export async function deleteChannel(projectId: string, channelId: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { channel_id: channelId } }
  const path = '/auth/v1/admin/notifications/{channel_id}'

  ensureSuccess(await apiClient.DELETE(path, { headers, params }))
}
