import { FilterBuilder, pathed } from './filter-builder'

export type OrderOptions = {
  ascending?: boolean
  nullsFirst?: boolean
  /** Orders the rows of an embed instead (`comments`). */
  referencedTable?: string
}

/** Filters plus order, page and shape of the result. */
export class QueryBuilder<Row, T> extends FilterBuilder<T> {
  order(column: string, options: OrderOptions = {}): this {
    const direction = directionOf(options.ascending)
    const nulls = nullsModifier(options.nullsFirst)
    this.request.params.push([
      pathed(options.referencedTable, 'order'),
      `${column}.${direction}${nulls}`,
    ])

    return this
  }

  /** At most `count` rows (the API answers at most 1000). */
  limit(count: number, options: { referencedTable?: string } = {}): this {
    assertRowCount('limit', count)
    this.request.params.push([pathed(options.referencedTable, 'limit'), String(count)])
    return this
  }

  /** Rows `from` to `to`, both included and counted from 0: `range(0, 9)` is the first ten. */
  range(from: number, to: number): this {
    assertRowCount('from', from)
    assertRowCount('to', to)

    if (to < from) {
      throw new RangeError('range: to must not be below from.')
    }

    this.request.params.push(['offset', String(from)], ['limit', String(to - from + 1)])
    return this
  }

  /** Answers one object; fails (`not_single_row`) unless exactly one row matches. */
  single(): QueryBuilder<Row, Row> {
    this.request.single = true
    return new QueryBuilder<Row, Row>(this.sender, this.request)
  }

  /**
   * After `insert`, `upsert`, `update` or `delete`: answer the written rows, shaped like a
   * read (`select('id, author:authors(name)')`).
   */
  select(columns = '*'): QueryBuilder<Row, Row[]> {
    this.request.params.push(['select', compact(columns)])
    this.request.prefer.push('return=representation')

    return new QueryBuilder<Row, Row[]>(this.sender, this.request)
  }
}

function directionOf(ascending: boolean | undefined): string {
  if (ascending === false) {
    return 'desc'
  }

  return 'asc'
}

function nullsModifier(nullsFirst: boolean | undefined): string {
  if (nullsFirst === undefined) {
    return ''
  }

  if (nullsFirst) {
    return '.nullsfirst'
  }

  return '.nullslast'
}

/** Spaces outside quotes are dropped, so `select('id, title')` reads naturally. */
export function compact(columns: string): string {
  let isQuoted = false
  let compacted = ''

  for (const character of columns) {
    if (character === '"') {
      isQuoted = isQuoted === false
    }

    if (/\s/.test(character) && isQuoted === false) {
      continue
    }

    compacted += character
  }

  return compacted
}

/** Row positions and counts are whole numbers, 0 or more: NaN, decimals or negatives would reach the API as a confusing parse error. */
function assertRowCount(name: string, value: number): void {
  if (Number.isSafeInteger(value) === false || value < 0) {
    throw new RangeError(`${name} must be a whole number, 0 or more.`)
  }
}
