import { KeyRound, ListTree } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatBytes, formatCount } from '@/shared/lib/format-number'
import { EmptyState } from '@/shared/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'
import { Section } from '@/shared/ui/section'

type TableOverview = components['schemas']['TableOverview']
type IndexOverview = components['schemas']['IndexOverview']

const NUMBER_CELL = 'text-end tabular-nums text-muted-foreground'

/** The table's indexes: what they cover, their size and how often the planner reads them. */
export function TableIndexesSection({ table }: { table: TableOverview }): JSX.Element {
  // An API older than the console (mid-deploy) omits the field: show none instead of failing.
  const indexes: readonly IndexOverview[] = table.indexes ?? []

  return (
    <Section title="Índices" meta={indexes.length} isFramed>
      <IndexesBody indexes={indexes} />
    </Section>
  )
}

function IndexesBody({ indexes }: { indexes: readonly IndexOverview[] }): JSX.Element {
  if (indexes.length === 0) {
    return (
      <EmptyState
        icon={<ListTree aria-hidden />}
        isCompact
        title="Nenhum índice"
        description="Consultas filtradas leem a tabela inteira. Crie índices no Editor SQL."
      />
    )
  }

  return (
    <Table aria-label="Índices da tabela">
      <TableHeader>
        <TableRow>
          <TableHead>Índice</TableHead>
          <TableHead>Colunas</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-end">Tamanho</TableHead>
          <TableHead className="text-end">Leituras</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {indexes.map((index) => (
          <IndexRow key={index.name} index={index} />
        ))}
      </TableBody>
    </Table>
  )
}

function IndexRow({ index }: { index: IndexOverview }): JSX.Element {
  return (
    <TableRow title={index.definition}>
      <TableCell className="max-w-64 whitespace-normal">
        <span className="flex items-center gap-1.5 font-mono font-medium text-heading">
          <PrimaryMark index={index} />
          <span className="break-all">{index.name}</span>
        </span>
      </TableCell>
      <TableCell className="max-w-56 font-mono break-all whitespace-normal text-muted-foreground">
        {index.columns.join(', ')}
      </TableCell>
      <TableCell className="text-muted-foreground">{kindOf(index)}</TableCell>
      <TableCell className={NUMBER_CELL}>{formatBytes(index.size_bytes)}</TableCell>
      <TableCell className={NUMBER_CELL}>{formatCount(index.scans)}</TableCell>
    </TableRow>
  )
}

function PrimaryMark({ index }: { index: IndexOverview }): JSX.Element | null {
  if (index.is_primary === false) {
    return null
  }

  return <KeyRound aria-label="Chave primária" className="size-4.5 shrink-0 text-primary" />
}

/** `primária`, `única` or the access method (`btree`, `gin`). */
function kindOf(index: IndexOverview): string {
  if (index.is_primary) {
    return 'primária'
  }

  if (index.is_unique) {
    return `única · ${index.method}`
  }

  return index.method
}
