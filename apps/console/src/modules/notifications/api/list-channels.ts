import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type NotificationChannel = components['schemas']['NotificationChannel']

/** Where the project sends its alerts, oldest first. */
export async function listChannels(
  projectId: string,
  signal?: AbortSignal,
): Promise<NotificationChannel[]> {
  const headers = projectHeaders(projectId)
  const list = dataOf(await apiClient.GET('/auth/v1/admin/notifications', { headers, signal }))

  return list.channels
}
