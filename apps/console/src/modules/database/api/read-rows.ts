import { type RowFilter, restQueryString } from '@/modules/database/components/row-filter'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

// `0-49/1234` for a page, or a star then `/0` for no rows; the total is a star when not counted.
const CONTENT_RANGE = /^(?:\d+-\d+|\*)\/(\d+)$/

export type TableRow = Record<string, unknown>

export type RowsPageQuery = {
  table: string
  offset: number
  limit: number
  filters: readonly RowFilter[]
}

export type CountQuery = {
  table: string
  filters: readonly RowFilter[]
  /** The planner's estimate of the table's rows; `null` before it was ever analyzed. */
  estimatedRows: number | null
}

/** Past this many rows a full `count(*)` costs too much; the planner's estimate is shown. */
const EXACT_COUNT_LIMIT = 100_000

export type RowsPage = { offset: number; rows: TableRow[] }

/** One page of a table's rows. The console reads them past row level security. */
export async function readRows(
  projectId: string,
  query: RowsPageQuery,
  signal?: AbortSignal,
): Promise<RowsPage> {
  const headers = { ...projectHeaders(projectId), Prefer: 'order=primary-key' }
  const page = { limit: query.limit, offset: query.offset }
  const params = { path: { table: query.table }, query: page }
  const querySerializer = (values: Record<string, unknown>): string =>
    restQueryString(values, query.filters)
  const rows = dataOf(
    await apiClient.GET('/rest/v1/{table}', { headers, params, signal, querySerializer }),
  )

  return { offset: query.offset, rows: rows.filter(isRow) }
}

/** How many rows the table has: no rows are read (`limit=0`), only counted, once per table. */
export async function countRows(
  projectId: string,
  query: CountQuery,
  signal?: AbortSignal,
): Promise<number | null> {
  const headers = { ...projectHeaders(projectId), Prefer: countPreference(query.estimatedRows) }
  const params = { path: { table: query.table }, query: { limit: 0 } }
  const querySerializer = (values: Record<string, unknown>): string =>
    restQueryString(values, query.filters)
  const result = await apiClient.GET('/rest/v1/{table}', {
    headers,
    params,
    signal,
    querySerializer,
  })
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
