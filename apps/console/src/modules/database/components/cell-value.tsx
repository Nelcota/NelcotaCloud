import type { JSX } from 'react'

import { cellText } from '@/modules/database/components/cell-text'

/** Compact preview. The row inspector shows the complete value. */
export function CellValue({ value }: { value: unknown }): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/70">NULL</span>
  }

  if (value === '') {
    return (
      <span className="text-muted-foreground/70">
        <span aria-hidden="true">''</span>
        <span className="sr-only">Texto vazio</span>
      </span>
    )
  }

  return <span className="block truncate">{cellText(value)}</span>
}
