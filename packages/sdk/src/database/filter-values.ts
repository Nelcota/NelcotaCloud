/** A value a filter compares a column with. */
export type FilterValue = string | number | boolean | null

/** Characters that would split a list or end a quoted value, so such values are quoted. */
const RESERVED_CHARACTERS = /[,()"\\\s]/

/**
 * A value as the API reads it: `null` and booleans as Postgres spells them, anything empty or
 * with reserved characters in double quotes with `"` and `\` escaped (the API unquotes it).
 */
export function formatValue(value: FilterValue): string {
  if (value === null) {
    return 'null'
  }

  const text = String(value)

  if (text !== '' && RESERVED_CHARACTERS.test(text) === false) {
    return text
  }

  return quoted(text)
}

/** `(1,2,"a,b")`: a list for the `in` operator, without `null` (it never matches, as in SQL). */
export function formatList(values: readonly FilterValue[]): string {
  const present = values.filter((value) => value !== null)

  return `(${present.map(formatValue).join(',')})`
}

/** `{a,"b c"}` for array columns (Postgres's array syntax); objects become JSON (`jsonb`). */
export function formatContainer(value: readonly FilterValue[] | Record<string, unknown>): string {
  if (Array.isArray(value)) {
    return `{${value.map(formatArrayElement).join(',')}}`
  }

  return JSON.stringify(value)
}

/**
 * Strings are always quoted in an array: unquoted, `""` would be no element, `"null"` a
 * `NULL`, and braces a nested array.
 */
function formatArrayElement(value: FilterValue): string {
  if (value === null) {
    return 'NULL'
  }

  if (typeof value === 'string') {
    return quoted(value)
  }

  return String(value)
}

function quoted(text: string): string {
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}
