import type { JSX } from 'react'
import { useState } from 'react'

import { CellValue } from '@/modules/database/components/cell-value'
import { GridHeader } from '@/modules/database/components/grid-header'
import {
  type GridColumn,
  type GridRow,
  GridRowDetails,
} from '@/modules/database/components/grid-row-details'
import { numericColumns } from '@/modules/database/components/numeric-columns'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { TableBody, TableCell, TableRow } from '@/shared/ui/primitives/table'

type DataGridProps = {
  label: string
  columns: readonly GridColumn[]
  /** Each row's values in the order of `columns`. */
  rows: readonly (readonly unknown[])[]
  rowOffset?: number
  /** Opens a row somewhere else (the row editor) instead of the read-only details panel. */
  onRowOpen?: (index: number) => void
}

/**
 * Rows as text in a grid that scrolls both ways under a sticky header. Positions are the keys:
 * results can repeat a column name (`?column?`) and rows have no identity of their own.
 * Unframed: the caller's panel draws the border.
 */
export function DataGrid(props: DataGridProps): JSX.Element {
  const { label, columns, rows, rowOffset = 0, onRowOpen } = props
  const [openRow, setOpenRow] = useState<GridRow | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const data = rows.map((cells, index) => ({ number: rowOffset + index + 1, cells }))
  const isNumeric = numericColumns(columns, rows)

  function showRow(row: GridRow): void {
    if (onRowOpen !== undefined) {
      onRowOpen(row.number - rowOffset - 1)
      return
    }

    setOpenRow(row)
    setIsOpen(true)
  }

  if (data.length === 0) {
    return <EmptyState isCompact title="Nenhuma linha no resultado" />
  }

  return (
    <>
      <div className="scrollbar-thin max-h-[32rem] min-w-0 overflow-auto overscroll-contain">
        <table
          aria-label={label}
          className="w-full border-separate border-spacing-0 font-mono text-xs"
        >
          <GridHeader columns={columns} isNumeric={isNumeric} />
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.number} className="[&>td]:border-b [&>td]:border-border/60">
                <TableCell className="sticky start-0 z-[1] h-8 w-12 bg-card px-1 py-0 ps-1">
                  <RowButton row={row} onShow={showRow} />
                </TableCell>
                {row.cells.map((value, index) => (
                  <TableCell
                    key={index}
                    className={cn('h-8 max-w-72 py-0', isNumeric[index] === true && 'text-end')}
                  >
                    <CellValue value={value} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
      <GridRowDetails
        row={openRow}
        label={label}
        columns={columns}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}

type RowButtonProps = { row: GridRow; onShow: (row: GridRow) => void }

function RowButton({ row, onShow }: RowButtonProps): JSX.Element {
  const number = row.number.toLocaleString('pt-BR')

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label={`Ver linha ${number}`}
      className="w-full justify-end font-mono text-muted-foreground tabular-nums"
      onClick={() => onShow(row)}
    >
      {number}
    </Button>
  )
}
