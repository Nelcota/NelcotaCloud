/** A value a filter compares a column with. */
export type FilterValue = string | number | boolean | null

/** Characters that would split a list or end a quoted value, so such values are quoted. */
const RESERVED_CHARACTERS = /[,()"\\\s]/

/**
 * A value as the API reads it: `null` and booleans as Postgres spells them, anything with
 * reserved characters in double quotes with `"` and `\` escaped (the API unquotes it).
 */
export function formatValue(value: FilterValue): string {
  if (value === null) {
    return 'null'
  }

  const text = String(value)

  if (RESERVED_CHARACTERS.test(text) === false) {
    return text
  }

  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

/** `(1,2,"a,b")`: a list for the `in` operator. */
export function formatList(values: readonly FilterValue[]): string {
  return `(${values.map(formatValue).join(',')})`
}

/** `{a,"b c"}` for array columns (Postgres's array syntax); objects become JSON (`jsonb`). */
export function formatContainer(value: readonly FilterValue[] | Record<string, unknown>): string {
  if (Array.isArray(value)) {
    return `{${value.map(formatValue).join(',')}}`
  }

  return JSON.stringify(value)
}
