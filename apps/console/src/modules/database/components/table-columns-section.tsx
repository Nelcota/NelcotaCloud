import type { JSX } from 'react'

import { AddColumnDialog } from '@/modules/database/components/add-column-dialog'
import { ColumnTraits } from '@/modules/database/components/column-traits'
import { DropColumnButton } from '@/modules/database/components/drop-column-button'
import { referenceTargets } from '@/modules/database/components/reference-targets'
import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type TableOverview = components['schemas']['TableOverview']

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
    <div className="grid gap-3">
      <AddColumnAction {...props} />
      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nulo</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead>Atributos</TableHead>
              <TableHead className="px-4">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.columns.map((column) => (
              <TableRow key={column.name}>
                <TableCell className="px-4 font-mono font-medium">{column.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono">{column.type}</TableCell>
                <TableCell className="text-muted-foreground">{yesNo(column.nullable)}</TableCell>
                <TableCell className="text-muted-foreground font-mono">
                  {column.default ?? '—'}
                </TableCell>
                <TableCell>
                  <ColumnTraits column={column} foreignKeys={table.foreign_keys} />
                </TableCell>
                <TableCell className="px-4 text-right">
                  <DropAction
                    isShown={isPlainTable(table)}
                    projectId={projectId}
                    table={table.name}
                    column={column.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
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
    <div className="flex justify-end">
      <AddColumnDialog
        projectId={projectId}
        table={table.name}
        targets={referenceTargets(tables)}
      />
    </div>
  )
}

type DropActionProps = { isShown: boolean; projectId: string; table: string; column: string }

function DropAction({ isShown, ...column }: DropActionProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return <DropColumnButton {...column} />
}

function yesNo(value: boolean): string {
  if (value) {
    return 'Sim'
  }

  return 'Não'
}
