import { apiClient } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type CreateTenantBody = components['schemas']['CreateTenantBody']
type CreatedTenantResponse = components['schemas']['CreatedTenantResponse']

/** A new project owned by the account; its keys come back only here. */
export async function createProject(body: CreateTenantBody): Promise<CreatedTenantResponse> {
  return dataOf(await apiClient.POST('/platform/v1/projects', { body }))
}
