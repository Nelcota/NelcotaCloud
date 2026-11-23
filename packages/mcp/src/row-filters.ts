import { z } from 'zod'

/** The Data API's filter operators an agent may use. */
export const FILTER_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
] as const

export const filterSchema = z.object({
  column: z.string().min(1).max(63),
  operator: z.enum(FILTER_OPERATORS),
  /** `null`, `true` or `false` for `is`; a comma list for `in`; `*` is the wildcard for `like`. */
  value: z.string().max(2000),
})

export type RowFilter = z.infer<typeof filterSchema>

/**
 * `["age", 'gte."18"']`. Plain values are quoted so commas and dots stay literal; `is` takes
 * its keyword and `in` its list as given.
 */
export function filterParam(filter: RowFilter): readonly [string, string] {
  const { column, operator, value } = filter

  if (operator === 'is') {
    return [column, `is.${value}`]
  }

  if (operator === 'in') {
    return [column, `in.(${value})`]
  }

  return [column, `${operator}.${quoted(value)}`]
}

function quoted(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}
