import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

/** Sends a test alert now; fails when the email server or chat service refuses it. */
export async function testChannel(projectId: string, channelId: string): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { channel_id: channelId } }
  const path = '/auth/v1/admin/notifications/{channel_id}/test'

  ensureSuccess(await apiClient.POST(path, { headers, params }))
}
