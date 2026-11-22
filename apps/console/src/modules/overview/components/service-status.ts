import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'
import type { StatusTone } from '@/shared/ui/status-badge'

type Schemas = components['schemas']

export type ServiceStatus = { tone: StatusTone; label: string }

/** What a query exposes that the status needs; works for any TanStack query result. */
export type QueryState<T> = {
  status: 'pending' | 'error' | 'success'
  data: T | undefined
  error?: Error | null
}

const CHECKING: ServiceStatus = { tone: 'neutral', label: 'Verificando' }
const UNAVAILABLE: ServiceStatus = { tone: 'error', label: 'Indisponível' }
const NOT_CONFIGURED: ServiceStatus = { tone: 'neutral', label: 'Não configurado' }

/** The server runs without that product (Storage without R2): a choice, not a failure. */
const NOT_CONFIGURED_CODES = new Set(['storage_not_configured'])

/** A query's status read through `describe` once it answers. */
export function statusOf<T>(
  query: QueryState<T>,
  describe: (data: T) => ServiceStatus,
): ServiceStatus {
  if (query.status === 'error' && isNotConfigured(query.error)) {
    return NOT_CONFIGURED
  }

  if (query.status === 'error') {
    return UNAVAILABLE
  }

  if (query.data === undefined) {
    return CHECKING
  }

  return describe(query.data)
}

function isNotConfigured(error: Error | null | undefined): boolean {
  return error instanceof ApiError && NOT_CONFIGURED_CODES.has(error.code)
}

export function apiStatus(): ServiceStatus {
  return { tone: 'success', label: 'No ar' }
}

export function databaseStatus(schema: Schemas['SchemaOverview']): ServiceStatus {
  const tables = schema.tables.filter((table) => table.kind === 'table').length

  return countStatus(tables, ['Sem tabelas', '1 tabela', 'tabelas'])
}

export function storageStatus(buckets: Schemas['Bucket'][]): ServiceStatus {
  return countStatus(buckets.length, ['Sem buckets', '1 bucket', 'buckets'])
}

export function emailStatus(smtp: Schemas['SmtpSettingsView']): ServiceStatus {
  if (smtp.is_custom) {
    return { tone: 'success', label: 'SMTP próprio' }
  }

  return { tone: 'neutral', label: 'SMTP da plataforma' }
}

export function webhooksStatus(endpoints: Schemas['WebhookEndpointView'][]): ServiceStatus {
  const enabled = endpoints.filter((endpoint) => endpoint.is_enabled).length

  return countStatus(enabled, ['Nenhum ativo', '1 ativo', 'ativos'])
}

/** Labels for none, one and many (the count goes before the last one). */
type CountLabels = [string, string, string]

function countStatus(count: number, [none, one, many]: CountLabels): ServiceStatus {
  if (count === 0) {
    return { tone: 'neutral', label: none }
  }

  if (count === 1) {
    return { tone: 'success', label: one }
  }

  return { tone: 'success', label: `${count.toLocaleString('pt-BR')} ${many}` }
}
