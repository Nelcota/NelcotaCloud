import type { components } from '@/shared/api/api-schema'

type ColumnOverview = components['schemas']['ColumnOverview']

export type SampleValue = string | number | boolean | Record<string, never>

/** Columns an insert example fills: at most this many, so the snippet stays readable. */
const MAX_SAMPLE_COLUMNS = 3

const NUMERIC_TYPES = ['smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision']

/** A value Postgres accepts for the column's type, for the insert and update examples. */
export function sampleValue(type: string): SampleValue {
  const base = type.toLowerCase()

  if (NUMERIC_TYPES.some((numeric) => base.startsWith(numeric))) {
    return 1
  }

  return textSample(base)
}

function textSample(base: string): SampleValue {
  if (base === 'boolean') {
    return true
  }

  if (base === 'uuid') {
    return '00000000-0000-0000-0000-000000000000'
  }

  if (base.startsWith('json')) {
    return {}
  }

  if (base === 'date') {
    return '2026-01-01'
  }

  if (base.startsWith('timestamp')) {
    return '2026-01-01T12:00:00Z'
  }

  return 'texto'
}

/** Columns the app sets itself: required ones first, then any without a default. */
export function insertColumns(columns: readonly ColumnOverview[]): ColumnOverview[] {
  const writable = columns.filter((column) => column.is_identity === false)
  const withoutDefault = writable.filter((column) => column.default === null)
  const required = withoutDefault.filter((column) => column.nullable === false)
  const chosen = [required, withoutDefault, writable].find((group) => group.length > 0) ?? []

  return chosen.slice(0, MAX_SAMPLE_COLUMNS)
}

/** The column that finds one row: the primary key when there is one. */
export function filterColumn(columns: readonly ColumnOverview[]): ColumnOverview | undefined {
  return columns.find((column) => column.is_primary_key) ?? columns.at(0)
}

/** The column an update example changes: one the app writes, never the key. */
export function updateColumn(columns: readonly ColumnOverview[]): ColumnOverview | undefined {
  const candidates = columns.filter(
    (column) => column.is_primary_key === false && column.is_identity === false,
  )

  return insertColumns(candidates).at(0)
}

export function sampleRow(columns: readonly ColumnOverview[]): Record<string, SampleValue> {
  return Object.fromEntries(columns.map((column) => [column.name, sampleValue(column.type)]))
}
