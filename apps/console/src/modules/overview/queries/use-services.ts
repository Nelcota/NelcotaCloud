import { Database, FolderOpen, Mail, ShieldCheck, Webhook } from 'lucide-react'

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
import type { IconComponent } from '@/shared/ui/icon-component'

export type Service = {
  name: string
  icon: IconComponent
  /** What it is, under the name. */
  kind: string
  /** The API path the service answers under. */
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
    {
      name: 'Auth',
      icon: ShieldCheck,
      kind: 'Contas, sessões e MFA',
      path: '/auth/v1',
      to: `${base}/users`,
      status: statusOf(health, apiStatus),
    },
    {
      name: 'Banco',
      icon: Database,
      kind: 'Postgres com API REST',
      path: '/rest/v1',
      to: `${base}/database`,
      status: statusOf(schema, databaseStatus),
    },
    {
      name: 'Arquivos',
      icon: FolderOpen,
      kind: 'Buckets e uploads',
      path: '/storage/v1',
      to: `${base}/storage`,
      status: statusOf(buckets, storageStatus),
    },
    {
      name: 'Webhooks',
      icon: Webhook,
      kind: 'Eventos assinados',
      path: '/auth/v1/admin/webhooks',
      to: `${base}/webhooks`,
      status: statusOf(webhooks, webhooksStatus),
    },
    {
      name: 'Email',
      icon: Mail,
      kind: 'Links de acesso',
      path: '/auth/v1/admin/smtp',
      to: `${base}/email`,
      status: statusOf(smtp, emailStatus),
    },
  ]
}
