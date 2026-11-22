import { cellText } from '@/modules/database/components/cell-text'
import type { components } from '@/shared/api/api-schema'

type ColumnOverview = components['schemas']['ColumnOverview']

/**
 * One field of the row form. `value` is what the user typed; `mode` says whether the column is
 * sent with that text, sent as NULL, or left out so Postgres fills its default.
 */
export type FieldDraft = { text: string; mode: FieldMode }
export type FieldMode = 'value' | 'null' | 'default'
export type RowDraft = Record<string, FieldDraft>

/** Edited as JSON: the Data API turns JSON arrays into Postgres arrays. */
export function isJsonColumn(column: ColumnOverview): boolean {
  return column.type === 'json' || column.type === 'jsonb' || column.type.endsWith('[]')
}

export function isBooleanColumn(column: ColumnOverview): boolean {
  return column.type === 'boolean'
}

/** A column a new row may leave to Postgres, which fills it (a default or an identity). */
export function canUseDefault(column: ColumnOverview): boolean {
  return (column.default !== null && column.default !== undefined) || column.is_identity
}

/** A new row: columns Postgres fills start left out, nullable ones start NULL. */
export function blankDraft(columns: readonly ColumnOverview[]): RowDraft {
  const entries = columns.map((column) => [column.name, blankField(column)] as const)

  return Object.fromEntries(entries)
}

function blankField(column: ColumnOverview): FieldDraft {
  if (canUseDefault(column)) {
    return { text: '', mode: 'default' }
  }

  if (column.nullable) {
    return { text: '', mode: 'null' }
  }

  return { text: '', mode: 'value' }
}

/** An existing row, as the grid read it. */
export function draftFromRow(
  columns: readonly ColumnOverview[],
  row: Record<string, unknown>,
): RowDraft {
  const entries = columns.map((column) => [column.name, fieldFromValue(row[column.name])] as const)

  return Object.fromEntries(entries)
}

function fieldFromValue(value: unknown): FieldDraft {
  if (value === null || value === undefined) {
    return { text: '', mode: 'null' }
  }

  return { text: cellText(value, 2), mode: 'value' }
}

/** A field's text is valid unless the column takes JSON and the text does not parse. */
export function fieldError(column: ColumnOverview, field: FieldDraft): string | null {
  if (field.mode !== 'value' || isJsonColumn(column) === false) {
    return null
  }

  if (parsedJson(field.text) === undefined) {
    return 'JSON inválido.'
  }

  return null
}

export function hasErrors(columns: readonly ColumnOverview[], draft: RowDraft): boolean {
  return columns.some((column) => fieldError(column, fieldOf(draft, column)) !== null)
}

export function fieldOf(draft: RowDraft, column: ColumnOverview): FieldDraft {
  return draft[column.name] ?? { text: '', mode: 'default' }
}

/** The body of an insert: every column except the ones left to Postgres. */
export function insertValues(
  columns: readonly ColumnOverview[],
  draft: RowDraft,
): Record<string, unknown> {
  const entries = columns
    .map((column) => [column, fieldOf(draft, column)] as const)
    .filter(([, field]) => field.mode !== 'default')
    .map(([column, field]) => [column.name, sentValue(column, field)])

  return Object.fromEntries(entries)
}

/** The body of an update: only the columns whose field changed since the row was read. */
export function changedValues(
  columns: readonly ColumnOverview[],
  drafts: { original: RowDraft; edited: RowDraft },
): Record<string, unknown> {
  const entries = columns
    .filter((column) => isChanged(fieldOf(drafts.original, column), fieldOf(drafts.edited, column)))
    .map((column) => [column.name, sentValue(column, fieldOf(drafts.edited, column))])

  return Object.fromEntries(entries)
}

function isChanged(original: FieldDraft, edited: FieldDraft): boolean {
  return original.mode !== edited.mode || original.text !== edited.text
}

/** Text goes as text and Postgres casts it to the column type; JSON columns get the document. */
function sentValue(column: ColumnOverview, field: FieldDraft): unknown {
  if (field.mode === 'null') {
    return null
  }

  if (isJsonColumn(column)) {
    return parsedJson(field.text) ?? null
  }

  return field.text
}

function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}
