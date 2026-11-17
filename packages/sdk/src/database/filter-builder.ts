import { type FilterValue, formatContainer, formatList, formatValue } from './filter-values'
import type { QueryRequest, QueryResult } from './query-request'
import type { QuerySender } from './query-sender'

/** Operators usable with `not` and `filter`. */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'cs'
  | 'cd'
  | 'ov'

type Container = readonly FilterValue[] | Record<string, unknown>

/**
 * Row filters of a query. Every method returns the same builder, so calls chain, and
 * `execute()` sends it: `.eq('published', true).gte('views', 100).execute()`. A column of an
 * embed is named with its path: `comments.author_id`.
 */
export class FilterBuilder<T> {
  protected readonly request: QueryRequest
  protected readonly sender: QuerySender

  constructor(sender: QuerySender, request: QueryRequest) {
    this.sender = sender
    this.request = request
  }

  eq(column: string, value: FilterValue): this {
    return this.filter(column, 'eq', formatValue(value))
  }

  neq(column: string, value: FilterValue): this {
    return this.filter(column, 'neq', formatValue(value))
  }

  gt(column: string, value: FilterValue): this {
    return this.filter(column, 'gt', formatValue(value))
  }

  gte(column: string, value: FilterValue): this {
    return this.filter(column, 'gte', formatValue(value))
  }

  lt(column: string, value: FilterValue): this {
    return this.filter(column, 'lt', formatValue(value))
  }

  lte(column: string, value: FilterValue): this {
    return this.filter(column, 'lte', formatValue(value))
  }

  /** `*` is the wildcard: `like('title', '*rust*')`. */
  like(column: string, pattern: string): this {
    return this.filter(column, 'like', pattern)
  }

  ilike(column: string, pattern: string): this {
    return this.filter(column, 'ilike', pattern)
  }

  is(column: string, value: null | boolean): this {
    return this.filter(column, 'is', formatValue(value))
  }

  in(column: string, values: readonly FilterValue[]): this {
    return this.filter(column, 'in', formatList(values))
  }

  /** Array or `jsonb` columns that contain every given element. */
  contains(column: string, value: Container): this {
    return this.filter(column, 'cs', formatContainer(value))
  }

  containedBy(column: string, value: Container): this {
    return this.filter(column, 'cd', formatContainer(value))
  }

  overlaps(column: string, value: readonly FilterValue[]): this {
    return this.filter(column, 'ov', formatContainer(value))
  }

  /** `not('deleted_at', 'is', null)`. */
  not(column: string, operator: FilterOperator, value: FilterValue | readonly FilterValue[]): this {
    return this.filter(column, `not.${operator}`, negatedValue(operator, value))
  }

  /** `or('age.lt.18,and(name.eq.ana,active.is.true)')`. */
  or(conditions: string, options: { referencedTable?: string } = {}): this {
    this.request.params.push([pathed(options.referencedTable, 'or'), `(${conditions})`])
    return this
  }

  /** Equality on every key: `match({ team_id: 3, active: true })`. */
  match(values: Record<string, FilterValue>): this {
    for (const [column, value] of Object.entries(values)) {
      this.eq(column, value)
    }

    return this
  }

  /** A raw `column=operator.value` filter, for operators without their own method. */
  filter(column: string, operator: string, value: string): this {
    this.request.params.push([column, `${operator}.${value}`])
    return this
  }

  /** Sends the query. */
  execute(): Promise<QueryResult<T>> {
    return this.sender.send<T>(this.request)
  }
}

/** A list for `in`, an array literal for the array operators, a single value otherwise. */
function negatedValue(
  operator: FilterOperator,
  value: FilterValue | readonly FilterValue[],
): string {
  if (Array.isArray(value) === false) {
    return formatValue(value as FilterValue)
  }

  const values = value as readonly FilterValue[]

  if (operator === 'in') {
    return formatList(values)
  }

  return formatContainer(values)
}

/** `comments.order` for an embed, `order` for the requested table. */
export function pathed(referencedTable: string | undefined, name: string): string {
  if (referencedTable === undefined) {
    return name
  }

  return `${referencedTable}.${name}`
}
