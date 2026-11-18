import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

// `0-49/1234` for a page, or a star then `/0` for no rows; the total is a star when not counted.
const CONTENT_RANGE = /^(?:\d+-\d+|\*)\/(\d+)$/

export type TableRow = Record<string, unknown>

export type RowsPageQuery = {
  table: string
  offset: number
  limit: number
  /** Sorted by this column so pages stay stable; `null` reads them unsorted. */
  orderColumn: string | null
}

export type CountQuery = {
  table: string
  /** The planner's estimate of the table's rows; `null` before it was ever analyzed. */
  estimatedRows: number | null
}

/** Past this many rows a full `count(*)` costs too much; the planner's estimate is shown. */
const EXACT_COUNT_LIMIT = 100_000

export type RowsPage = { rows: TableRow[] }

/** One page of a table's rows. The console reads them past row level security. */
export async function readRows(projectId: string, query: RowsPageQuery): Promise<RowsPage> {
  const headers = projectHeaders(projectId)
  const page = { limit: query.limit, offset: query.offset, ...orderQuery(query.orderColumn) }
  const params = { path: { table: query.table }, query: page }
  const rows = dataOf(await apiClient.GET('/rest/v1/{table}', { headers, params }))

  return { rows: rows.filter(isRow) }
}

/** How many rows the table has: no rows are read (`limit=0`), only counted, once per table. */
export async function countRows(projectId: string, query: CountQuery): Promise<number | null> {
  const headers = { ...projectHeaders(projectId), Prefer: countPreference(query.estimatedRows) }
  const params = { path: { table: query.table }, query: { limit: 0 } }
  const result = await apiClient.GET('/rest/v1/{table}', { headers, params })
  dataOf(result)

  return totalOf(result.response.headers.get('Content-Range'))
}

function countPreference(estimatedRows: number | null): string {
  if (isCountEstimated(estimatedRows)) {
    return 'count=planned'
  }

  return 'count=exact'
}

/** Large tables get the planner's estimate, which may be below the rows that really exist. */
export function isCountEstimated(estimatedRows: number | null): boolean {
  return estimatedRows !== null && estimatedRows > EXACT_COUNT_LIMIT
}

function orderQuery(orderColumn: string | null): { order?: string } {
  if (orderColumn === null) {
    return {}
  }

  return { order: `${orderColumn}.asc` }
}

function isRow(value: unknown): value is TableRow {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}

function totalOf(contentRange: string | null): number | null {
  const total = CONTENT_RANGE.exec(contentRange ?? '')?.[1]

  if (total === undefined) {
    return null
  }

  return Number(total)
}
