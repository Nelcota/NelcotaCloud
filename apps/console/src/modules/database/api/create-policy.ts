import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type PolicyCreation = {
  table: string
  policy: components['schemas']['CreatePolicyRequest']
}

export async function createPolicy(projectId: string, creation: PolicyCreation): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table: creation.table } }
  const body = creation.policy

  ensureSuccess(
    await apiClient.POST('/database/v1/tables/{table}/policies', { body, headers, params }),
  )
}
