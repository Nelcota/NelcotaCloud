import type { JSX } from 'react'

import type { GridColumn } from '@/modules/database/components/grid-row-details'
import { cn } from '@/shared/lib/utils'
import { TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

/** Solid so rows never show through while they scroll under it. */
const STICKY_HEAD = 'sticky top-0 z-[2] h-8 border-b border-border/60 bg-card font-mono'

type GridHeaderProps = {
  columns: readonly GridColumn[]
  /** Number columns, aligned to the right like their values. */
  isNumeric: readonly boolean[]
}

/** Column names in the code font, each with its type when the source knows it. */
export function GridHeader({ columns, isNumeric }: GridHeaderProps): JSX.Element {
  return (
    <TableHeader className="bg-transparent">
      <TableRow className="hover:bg-transparent">
        <TableHead className={cn(STICKY_HEAD, 'left-0 z-[3] w-12 px-2 text-right')}>#</TableHead>
        {columns.map((column, index) => (
          <TableHead
            key={index}
            className={cn(STICKY_HEAD, isNumeric[index] === true && 'text-right')}
          >
            {column.name}
            <ColumnType type={column.type} />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  )
}

function ColumnType({ type }: { type?: string }): JSX.Element | null {
  if (type === undefined) {
    return null
  }

  return <span className="ms-1.5 text-faint">{type}</span>
}
