import type { JSX } from 'react'

import type { RowTarget } from '@/modules/database/components/row-editor-sheet'
import type { components } from '@/shared/api/api-schema'
import { CopyButton } from '@/shared/ui/copy-button'
import { SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/primitives/sheet'

type TableOverview = components['schemas']['TableOverview']

type RowFormHeadingProps = { table: TableOverview; target: RowTarget }

/** The panel's title: a new row, or the row's number with its JSON one copy away. */
export function RowFormHeading({ table, target }: RowFormHeadingProps): JSX.Element {
  if (target.kind === 'new') {
    return (
      <SheetHeader>
        <SheetTitle>Nova linha</SheetTitle>
        <SheetDescription>{table.name}</SheetDescription>
      </SheetHeader>
    )
  }

  return (
    <SheetHeader className="flex-row items-start justify-between gap-3">
      <div className="grid gap-1">
        <SheetTitle>Linha {target.number.toLocaleString('pt-BR')}</SheetTitle>
        <SheetDescription>{table.name}</SheetDescription>
      </div>
      <CopyButton value={target.json} description={`linha ${target.number} em JSON`} />
    </SheetHeader>
  )
}
