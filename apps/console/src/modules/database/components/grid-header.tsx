import type { JSX } from 'react'

import type { GridColumn } from '@/modules/database/components/grid-row-details'
import { TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

/** Solid so rows never show through while they scroll under it. */
const STICKY_HEAD = 'sticky top-0 z-[2] border-b bg-card'

/** Column names in the code font, each with its type when the source knows it. */
export function GridHeader({ columns }: { columns: readonly GridColumn[] }): JSX.Element {
  return (
    <TableHeader className="bg-transparent">
      <TableRow className="hover:bg-transparent">
        <TableHead className={`${STICKY_HEAD} left-0 z-[3] w-12 px-2 text-right`}>#</TableHead>
        {columns.map((column, index) => (
          <TableHead key={index} className={`${STICKY_HEAD} h-auto border-l px-3 py-1.5`}>
            <span className="grid">
              <span className="font-mono text-sm text-foreground">{column.name}</span>
              <ColumnType type={column.type} />
            </span>
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

  return <span className="font-mono text-xs font-normal">{type}</span>
}
