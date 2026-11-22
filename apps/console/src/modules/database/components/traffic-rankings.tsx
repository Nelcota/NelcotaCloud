import type { JSX } from 'react'

import type { ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { RankedList } from '@/shared/ui/ranked-list'
import { StatusDot } from '@/shared/ui/status-dot'

/** The busiest tables and functions, and how the API answered. */
export function TrafficRankings({ report }: { report: ApiUsageReport }): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <RankedList
        title="Tabelas e funções"
        columns={{ label: 'Recurso', value: 'Requisições' }}
        items={report.resources.map((resource) => ({
          key: resource.name,
          label: resourceLabel(resource.name),
          value: resource.requests,
        }))}
        empty="Nenhuma requisição no período."
      />
      <RankedList
        title="Status"
        columns={{ label: 'Código', value: 'Requisições' }}
        items={report.statuses.map((entry) => ({
          key: String(entry.status),
          label: <StatusLabel status={entry.status} />,
          value: entry.requests,
        }))}
        empty="Nenhuma resposta no período."
      />
    </div>
  )
}

/** Names that matched no table are gathered under one row. */
function resourceLabel(name: string): string {
  if (name === '') {
    return 'nomes desconhecidos'
  }

  return name
}

function StatusLabel({ status }: { status: number }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot tone={statusTone(status)} label={statusMeaning(status)} />
      {status}
    </span>
  )
}

function statusMeaning(status: number): string {
  if (status >= 500) {
    return 'Erro do servidor'
  }

  if (status >= 400) {
    return 'Erro do cliente'
  }

  return 'Sucesso'
}

function statusTone(status: number): 'success' | 'warning' | 'error' {
  if (status >= 500) {
    return 'error'
  }

  if (status >= 400) {
    return 'warning'
  }

  return 'success'
}
