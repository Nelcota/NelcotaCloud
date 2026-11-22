import type { GridColumn } from '@/modules/database/components/grid-row-details'

/** Postgres's number types as the schema writes them, without array types. */
const NUMERIC_TYPE =
  /^(smallint|integer|bigint|numeric|decimal|real|double precision|money|int2|int4|int8|float4|float8)\b(?!.*\[\])/u

/** A plain decimal as Postgres prints it, for results that carry no column type. */
const NUMERIC_TEXT = /^-?\d+(?:\.\d+)?$/u

type GridCells = readonly (readonly unknown[])[]

/** Which columns hold numbers, so the grid aligns them to the right. */
export function numericColumns(columns: readonly GridColumn[], rows: GridCells): boolean[] {
  return columns.map((column, index) => isNumericColumn(column, rows, index))
}

function isNumericColumn(column: GridColumn, rows: GridCells, index: number): boolean {
  if (column.type !== undefined) {
    return NUMERIC_TYPE.test(column.type)
  }

  const values = rows.map((cells) => cells[index]).filter((value) => isBlank(value) === false)

  return values.length > 0 && values.every(isNumericValue)
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return true
  }

  return typeof value === 'string' && NUMERIC_TEXT.test(value)
}
