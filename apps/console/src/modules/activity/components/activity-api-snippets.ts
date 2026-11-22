import { type AuditFilter, auditQuery } from '@/modules/activity/api/list-audit-events'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

const EVENTS_PATH = '/auth/v1/admin/audit-events'
const SECRET_HEADER = '-H "apikey: $NELCOTA_SECRET_KEY"'

/** The log's three calls with the filters on screen, as curl and as a raw HTTP request. */
export function activitySnippets(filter: AuditFilter): ApiSnippet[] {
  const query = queryString(filter)
  const pageQuery = joinQuery(query, 'limit=50')
  const summaryQuery = queryString({ days: filter.days })

  return [
    {
      label: 'Eventos',
      title: 'curl',
      code: [
        `curl "${API_BASE_URL}${EVENTS_PATH}${pageQuery}" \\`,
        `  ${SECRET_HEADER}`,
        '',
        '# Página seguinte: repita com &before=<next_before> da resposta.',
      ].join('\n'),
    },
    {
      label: 'Resumo',
      title: 'curl',
      code: [
        `curl "${API_BASE_URL}${EVENTS_PATH}/summary${summaryQuery}" \\`,
        `  ${SECRET_HEADER}`,
      ].join('\n'),
    },
    {
      label: 'Exportar CSV',
      title: 'curl',
      code: [
        `curl "${API_BASE_URL}${EVENTS_PATH}/export${query}" \\`,
        `  ${SECRET_HEADER} \\`,
        '  -o atividade.csv',
      ].join('\n'),
    },
    {
      label: 'HTTP',
      title: 'http',
      code: [
        `GET ${EVENTS_PATH}${pageQuery} HTTP/1.1`,
        `Host: ${hostOf(API_BASE_URL)}`,
        'apikey: $NELCOTA_SECRET_KEY',
        'Accept: application/json',
      ].join('\n'),
    },
  ]
}

/** "?days=7&kind=failures", or nothing when no filter is on. */
function queryString(filter: AuditFilter): string {
  const params = new URLSearchParams()

  for (const [name, value] of Object.entries(auditQuery(filter))) {
    if (value !== undefined && value !== '') {
      params.set(name, String(value))
    }
  }

  const text = params.toString()

  if (text === '') {
    return ''
  }

  return `?${text}`
}

function joinQuery(query: string, extra: string): string {
  if (query === '') {
    return `?${extra}`
  }

  return `${query}&${extra}`
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
