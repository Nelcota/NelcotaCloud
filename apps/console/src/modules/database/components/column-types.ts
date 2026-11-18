/** The column types the API creates; any of them can also be an array. */
export const COLUMN_TYPES = [
  'text',
  'varchar',
  'smallint',
  'integer',
  'bigint',
  'numeric',
  'real',
  'double',
  'boolean',
  'uuid',
  'date',
  'time',
  'timestamp',
  'timestamptz',
  'json',
  'jsonb',
  'bytea',
] as const

export type ColumnType = (typeof COLUMN_TYPES)[number]

/** Only these can be numbered automatically (identity). */
const INTEGER_TYPES: readonly ColumnType[] = ['smallint', 'integer', 'bigint']

/** Offered under the default field; any literal value is accepted too. */
export const DEFAULT_SUGGESTIONS = [
  'now()',
  'gen_random_uuid()',
  'auth.uid()',
  'current_date',
  'current_timestamp',
  'true',
  'false',
] as const

export type OnDeleteAction = 'no_action' | 'cascade' | 'set_null'

/** What happens to this row when the row it points to is deleted. */
export const ON_DELETE_OPTIONS: readonly { value: OnDeleteAction; label: string }[] = [
  { value: 'no_action', label: 'Impedir a exclusão' },
  { value: 'cascade', label: 'Excluir esta linha também' },
  { value: 'set_null', label: 'Deixar esta coluna nula' },
]

export function isColumnType(value: string): value is ColumnType {
  return COLUMN_TYPES.some((type) => type === value)
}

export function isOnDeleteAction(value: string): value is OnDeleteAction {
  return ON_DELETE_OPTIONS.some((option) => option.value === value)
}

export function isIntegerType(type: ColumnType): boolean {
  return INTEGER_TYPES.includes(type)
}
