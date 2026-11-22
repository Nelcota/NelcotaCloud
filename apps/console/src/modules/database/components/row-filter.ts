export type RowFilterOperator =
  | 'eq'
  | 'neq'
  | 'ilike'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is-null'
  | 'not-null'

export type RowFilter = { column: string; operator: RowFilterOperator; value: string }

type OperatorInfo = { value: RowFilterOperator; label: string; symbol: string }

const EQUAL: OperatorInfo = { value: 'eq', label: 'igual a', symbol: '=' }

export const ROW_FILTER_OPERATORS: readonly OperatorInfo[] = [
  EQUAL,
  { value: 'neq', label: 'diferente de', symbol: '≠' },
  { value: 'ilike', label: 'contém', symbol: 'contém' },
  { value: 'gt', label: 'maior que', symbol: '>' },
  { value: 'gte', label: 'maior ou igual a', symbol: '≥' },
  { value: 'lt', label: 'menor que', symbol: '<' },
  { value: 'lte', label: 'menor ou igual a', symbol: '≤' },
  { value: 'is-null', label: 'é nulo', symbol: 'é nulo' },
  { value: 'not-null', label: 'não é nulo', symbol: 'não é nulo' },
]

/** Past this many filters the URL grows for nothing: nobody narrows a table ten ways at once. */
export const MAX_ROW_FILTERS = 8

export function isRowFilterOperator(value: string): value is RowFilterOperator {
  return ROW_FILTER_OPERATORS.some((operator) => operator.value === value)
}

export function operatorInfo(operator: RowFilterOperator): OperatorInfo {
  return ROW_FILTER_OPERATORS.find((info) => info.value === operator) ?? EQUAL
}

/** The two null checks compare with nothing, so they take no value. */
export function needsValue(operator: RowFilterOperator): boolean {
  return operator !== 'is-null' && operator !== 'not-null'
}

/** `["city", 'ilike."*Rio*"']`: the value is always quoted, so commas and dots stay literal. */
export function filterParam(filter: RowFilter): [string, string] {
  const { column, operator, value } = filter

  if (operator === 'is-null') {
    return [column, 'is.null']
  }

  if (operator === 'not-null') {
    return [column, 'not.is.null']
  }

  if (operator === 'ilike') {
    return [column, `ilike.${quoted(`*${value}*`)}`]
  }

  return [column, `${operator}.${quoted(value)}`]
}

/** The Data API's quoting: double quotes, with backslash escaping a quote or a backslash. */
function quoted(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

/** The query string of a Data API call: its plain parameters, then one per filter. */
export function restQueryString(
  query: Record<string, unknown>,
  filters: readonly RowFilter[],
): string {
  const params = new URLSearchParams()

  for (const [name, value] of Object.entries(query)) {
    appendParam(params, name, value)
  }

  for (const filter of filters) {
    params.append(...filterParam(filter))
  }

  return params.toString()
}

function appendParam(params: URLSearchParams, name: string, value: unknown): void {
  if (typeof value === 'string' || typeof value === 'number') {
    params.append(name, String(value))
  }
}

/** A stable text for query keys: two equal filter lists give the same key. */
export function filtersKey(filters: readonly RowFilter[]): string {
  return filters.map((filter) => filterParam(filter).join('=')).join('&')
}
