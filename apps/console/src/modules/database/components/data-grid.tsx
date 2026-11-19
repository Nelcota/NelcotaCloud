import type { JSX } from 'react'

import { CellValue } from '@/modules/database/components/cell-value'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

/** A column of the grid; the type, when known, is shown beside its name. */
export type GridColumn = { name: string; type?: string }

type DataGridProps = {
  label: string
  columns: readonly GridColumn[]
  /** Each row's values in the order of `columns`. */
  rows: readonly (readonly unknown[])[]
}

/**
 * Rows as text in a scrolling grid. Positions are the keys: results can repeat a column name
 * (`?column?`) and rows have no identity of their own.
 */
export function DataGrid({ label, columns, rows }: DataGridProps): JSX.Element {
  return (
    <div className="surface overflow-hidden">
      <Table aria-label={label} className="font-mono text-xs">
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className="px-3">
                <span className="text-foreground">{column.name}</span>
                <ColumnType type={column.type} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, rowIndex) => (
            <TableRow key={rowIndex}>
              {cells.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="px-3">
                  <CellValue value={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ColumnType({ type }: { type?: string }): JSX.Element | null {
  if (type === undefined) {
    return null
  }

  return <span className="text-muted-foreground ml-2 font-normal">{type}</span>
}
