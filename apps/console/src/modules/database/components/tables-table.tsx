import Database from '~icons/solar/database-linear'
import Hashtag from '~icons/solar/hashtag-linear'
import List from '~icons/solar/list-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { RlsOffMarker } from '@/modules/database/components/rls-off-marker'
import {
  estimatedRowsLabel,
  isPlainTable,
  kindLabel,
} from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { ColumnLabel } from '@/shared/ui/column-label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type TableOverview = components['schemas']['TableOverview']

type TablesTableProps = { projectId: string; tables: readonly TableOverview[] }

/** The project's tables and views, each linking to its page. */
export function TablesTable({ projectId, tables }: TablesTableProps): JSX.Element {
  return (
    <div className="surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">
              <ColumnLabel icon={Database}>Nome</ColumnLabel>
            </TableHead>
            <TableHead className="text-right">
              <ColumnLabel icon={Hashtag}>Linhas (estimativa)</ColumnLabel>
            </TableHead>
            <TableHead className="px-4 text-right">
              <ColumnLabel icon={List}>Colunas</ColumnLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table) => (
            <TableRow key={table.name}>
              <TableCell className="w-full max-w-0 px-4 whitespace-normal">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    to="/projects/$projectId/database/$table"
                    params={{ projectId, table: table.name }}
                    className="font-mono font-medium break-all underline-offset-4 hover:underline"
                  >
                    {table.name}
                  </Link>
                  <KindNote table={table} />
                  <RlsOffMarker table={table} />
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {estimatedRowsLabel(table)}
              </TableCell>
              <TableCell className="text-muted-foreground px-4 text-right tabular-nums">
                {table.columns.length}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Tables are the norm; only views and other kinds are named. */
function KindNote({ table }: { table: TableOverview }): JSX.Element | null {
  if (isPlainTable(table)) {
    return null
  }

  return <span className="text-muted-foreground text-xs">{kindLabel(table.kind)}</span>
}
