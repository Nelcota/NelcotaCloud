import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import {
  apiStatus,
  databaseStatus,
  emailStatus,
  type ServiceStatus,
  statusOf,
  storageStatus,
  webhooksStatus,
} from '@/modules/overview/components/service-status'
import { useBucketsQuery } from '@/modules/overview/queries/use-buckets-query'
import { useWebhookEndpointsQuery } from '@/modules/overview/queries/use-webhook-endpoints-query'
import { useSmtpQuery } from '@/modules/project-settings/queries/use-project-settings'
import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'

export type Service = {
  name: string
  /** The API path the service answers under, or the admin route that configures it. */
  path: string
  to: string
  status: ServiceStatus
}

/** The project's products with their live state, each linked to its page. */
export function useServices(projectId: string): Service[] {
  const base = `/projects/${projectId}`
  const health = useApiHealthQuery()
  const schema = useSchemaQuery(projectId)
  const buckets = useBucketsQuery(projectId)
  const smtp = useSmtpQuery(projectId)
  const webhooks = useWebhookEndpointsQuery(projectId)

  return [
    { name: 'Auth', path: '/auth/v1', to: `${base}/users`, status: statusOf(health, apiStatus) },
    {
      name: 'Banco (Data API)',
      path: '/rest/v1',
      to: `${base}/database`,
      status: statusOf(schema, databaseStatus),
    },
    {
      name: 'Arquivos',
      path: '/storage/v1',
      to: `${base}/storage`,
      status: statusOf(buckets, storageStatus),
    },
    {
      name: 'Email',
      path: '/auth/v1/admin/smtp',
      to: `${base}/email`,
      status: statusOf(smtp, emailStatus),
    },
    {
      name: 'Webhooks',
      path: '/auth/v1/admin/webhooks',
      to: `${base}/webhooks`,
      status: statusOf(webhooks, webhooksStatus),
    },
  ]
}
