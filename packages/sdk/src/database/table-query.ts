import { QueryBuilder, compact } from './query-builder'
import { newRequest } from './query-request'
import type { QuerySender } from './query-sender'

export type CountOption = {
  /** `exact` counts every matching row; `planned` takes the planner's fast estimate. */
  count?: 'exact' | 'planned'
}

export type UpsertOptions = {
  /** Unique columns rows are matched on; the primary key when absent. */
  onConflict?: string
  /** Keep existing rows untouched instead of updating them. */
  ignoreDuplicates?: boolean
}

function resolutionOf(options: UpsertOptions): string {
  if (options.ignoreDuplicates === true) {
    return 'resolution=ignore-duplicates'
  }

  return 'resolution=merge-duplicates'
}

/** A table (or view) of the project's database: `client.from('posts')`. */
export class TableQuery<Row extends Record<string, unknown>> {
  private readonly sender: QuerySender
  private readonly path: string

  constructor(sender: QuerySender, table: string) {
    this.sender = sender
    this.path = `/${encodeURIComponent(table)}`
  }

  /** `select('id, title, author:authors(name), comments(body)')`. */
  select(columns = '*', options: CountOption = {}): QueryBuilder<Row, Row[]> {
    const request = newRequest('GET', this.path)
    request.params.push(['select', compact(columns)])

    if (options.count !== undefined) {
      request.prefer.push(`count=${options.count}`)
    }

    return new QueryBuilder<Row, Row[]>(this.sender, request)
  }

  /** One row or up to 1000; a column a row leaves out takes its default. */
  insert(rows: Partial<Row> | Partial<Row>[]): QueryBuilder<Row, null> {
    const request = newRequest('POST', this.path)
    request.body = rows

    return new QueryBuilder<Row, null>(this.sender, request)
  }

  /** Inserts, or updates the rows that already exist (matched on `onConflict`). */
  upsert(
    rows: Partial<Row> | Partial<Row>[],
    options: UpsertOptions = {},
  ): QueryBuilder<Row, null> {
    const request = newRequest('POST', this.path)
    request.body = rows
    request.prefer.push(resolutionOf(options))

    if (options.onConflict !== undefined) {
      request.params.push(['on_conflict', compact(options.onConflict)])
    }

    return new QueryBuilder<Row, null>(this.sender, request)
  }

  /** Sets `values` on every row matching the filters; at least one filter is required. */
  update(values: Partial<Row>): QueryBuilder<Row, null> {
    const request = newRequest('PATCH', this.path)
    request.body = values

    return new QueryBuilder<Row, null>(this.sender, request)
  }

  /** Deletes every row matching the filters; at least one filter is required. */
  delete(): QueryBuilder<Row, null> {
    return new QueryBuilder<Row, null>(this.sender, newRequest('DELETE', this.path))
  }
}
