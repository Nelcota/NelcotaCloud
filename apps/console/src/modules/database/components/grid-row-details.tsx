import type { JSX } from 'react'

import { cellText } from '@/modules/database/components/cell-text'
import { CodeBlock } from '@/shared/ui/code-block'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/primitives/sheet'

export type GridColumn = { name: string; type?: string; is_primary_key?: boolean }
export type GridRow = { number: number; cells: readonly unknown[] }

type GridRowDetailsProps = {
  /** Kept after closing so the panel does not go blank while it slides out. */
  row: GridRow | null
  label: string
  columns: readonly GridColumn[]
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** Every value of one row, complete and copyable, in a side panel. */
export function GridRowDetails(props: GridRowDetailsProps): JSX.Element | null {
  const { row, label, columns } = props

  if (row === null) {
    return null
  }

  return (
    <Sheet open={props.isOpen} onOpenChange={props.onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Linha {row.number.toLocaleString('pt-BR')}</SheetTitle>
          <SheetDescription>{label}</SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-6">
          <dl className="flex flex-col gap-4">
            {columns.map((column, index) => (
              <div key={index} className="grid min-w-0 gap-1.5">
                <dt className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-medium">{column.name}</span>
                  <TypeLabel type={column.type} />
                </dt>
                <dd className="min-w-0">
                  <ValueText name={column.name} value={row.cells[index]} />
                </dd>
              </div>
            ))}
          </dl>
          <CodeBlock
            code={rowJson(columns, row)}
            title="json"
            copyLabel={`linha ${row.number} em JSON`}
            maxHeight={360}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function TypeLabel({ type }: { type: string | undefined }): JSX.Element | null {
  if (type === undefined) {
    return null
  }

  return <span className="font-mono text-xs text-muted-foreground">{type}</span>
}

function ValueText({ name, value }: { name: string; value: unknown }): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="font-mono text-sm text-muted-foreground">NULL</span>
  }

  if (value === '') {
    return <span className="text-sm text-muted-foreground">Texto vazio</span>
  }

  return (
    <CodeBlock
      code={cellText(value, 2)}
      title={valueKind(value)}
      copyLabel={name}
      maxHeight={320}
      isWrapped
    />
  )
}

/** Objects and arrays print as JSON; the bar says so. */
function valueKind(value: unknown): string {
  if (typeof value === 'object') {
    return 'json'
  }

  return 'valor'
}

/** The whole row as one JSON object, as the Data API returns it. */
function rowJson(columns: readonly GridColumn[], row: GridRow): string {
  const entries = columns.map((column, index) => [column.name, row.cells[index] ?? null])

  return JSON.stringify(Object.fromEntries(entries), null, 2)
}
