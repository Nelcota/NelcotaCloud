import type { JSX } from 'react'

import { AddColumnDialog } from '@/modules/database/components/add-column-dialog'
import { ColumnTraits } from '@/modules/database/components/column-traits'
import { DropColumnButton } from '@/modules/database/components/drop-column-button'
import { referenceTargets } from '@/modules/database/components/reference-targets'
import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
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
type ColumnOverview = components['schemas']['ColumnOverview']

type TableColumnsSectionProps = {
  projectId: string
  table: TableOverview
  /** Every table of the project, for the columns a new foreign key can point to. */
  tables: readonly TableOverview[]
}

/** The table's columns; plain tables also add and drop them here. */
export function TableColumnsSection(props: TableColumnsSectionProps): JSX.Element {
  const { projectId, table } = props

  return (
    <Section
      title="Colunas"
      meta={table.columns.length}
      action={<AddColumnAction {...props} />}
      isFramed
    >
      <Table aria-label="Colunas da tabela">
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nulo</TableHead>
            <TableHead>Padrão</TableHead>
            <TableHead>Atributos</TableHead>
            <ActionsHead table={table} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.columns.map((column) => (
            <ColumnRow key={column.name} projectId={projectId} table={table} column={column} />
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

type ColumnRowProps = { projectId: string; table: TableOverview; column: ColumnOverview }

function ColumnRow({ projectId, table, column }: ColumnRowProps): JSX.Element {
  return (
    <TableRow>
      <TableCell className="font-mono font-medium text-heading">{column.name}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{column.type}</TableCell>
      <TableCell className="text-muted-foreground">{yesNo(column.nullable)}</TableCell>
      <TableCell className="max-w-56 truncate font-mono text-muted-foreground">
        {column.default ?? '—'}
      </TableCell>
      <TableCell>
        <ColumnTraits column={column} foreignKeys={table.foreign_keys} />
      </TableCell>
      <DropCell projectId={projectId} table={table} column={column} />
    </TableRow>
  )
}

function ActionsHead({ table }: { table: TableOverview }): JSX.Element | null {
  if (isPlainTable(table) === false) {
    return null
  }

  return (
    <TableHead className="w-10">
      <span className="sr-only">Ações</span>
    </TableHead>
  )
}

function DropCell({ projectId, table, column }: ColumnRowProps): JSX.Element | null {
  if (isPlainTable(table) === false) {
    return null
  }

  return (
    <TableCell className="py-1 text-end">
      <DropColumnButton projectId={projectId} table={table.name} column={column.name} />
    </TableCell>
  )
}

function AddColumnAction({
  projectId,
  table,
  tables,
}: TableColumnsSectionProps): JSX.Element | null {
  if (isPlainTable(table) === false) {
    return null
  }

  return (
    <AddColumnDialog projectId={projectId} table={table.name} targets={referenceTargets(tables)} />
  )
}

function yesNo(value: boolean): string {
  if (value) {
    return 'Sim'
  }

  return 'Não'
}
