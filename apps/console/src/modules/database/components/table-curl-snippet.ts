import {
  filterColumn,
  insertColumns,
  sampleRow,
  sampleValue,
  updateColumn,
} from '@/modules/database/components/sample-values'
import { curlAuthLines, restUrl, shellQuote } from '@/modules/database/components/snippet-syntax'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']
type ColumnOverview = components['schemas']['ColumnOverview']

const JSON_HEADER = "  -H 'Content-Type: application/json' \\"

/** The same four operations over HTTP, as the user whose access token goes in `Authorization`. */
export function tableCurlSnippet(table: TableOverview, publishableKey: string | null): string {
  const path = encodeURIComponent(table.name)
  const auth = curlAuthLines(publishableKey)
  const body = JSON.stringify(sampleRow(insertColumns(table.columns)))
  const lines = [
    '# Ler (sem Authorization, o pedido roda como anon)',
    `curl ${shellQuote(restUrl(`${path}?select=*&limit=20`))} \\`,
    ...auth,
    '',
    '# Inserir',
    `curl -X POST ${shellQuote(restUrl(path))} \\`,
    JSON_HEADER,
    `  -d ${shellQuote(body)} \\`,
    ...auth,
    ...filteredLines(table, path, auth),
  ]

  return lines.join('\n')
}

function filteredLines(table: TableOverview, path: string, auth: string[]): string[] {
  const filter = filterColumn(table.columns)

  if (filter === undefined) {
    return []
  }

  const url = shellQuote(restUrl(`${path}?${filterQuery(filter)}`))

  return [...updateLines(table, url, auth), '', '# Excluir', `curl -X DELETE ${url} \\`, ...auth]
}

function updateLines(table: TableOverview, url: string, auth: string[]): string[] {
  const column = updateColumn(table.columns)

  if (column === undefined) {
    return []
  }

  const body = JSON.stringify(sampleRow([column]))

  return [
    '',
    '# Atualizar: PATCH e DELETE precisam de um filtro',
    `curl -X PATCH ${url} \\`,
    JSON_HEADER,
    `  -d ${shellQuote(body)} \\`,
    ...auth,
  ]
}

function filterQuery(column: ColumnOverview): string {
  const value = String(sampleValue(column.type))

  return `${encodeURIComponent(column.name)}=eq.${encodeURIComponent(value)}`
}
