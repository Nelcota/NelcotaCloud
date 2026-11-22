import type { JSX } from 'react'

import { RlsBadge } from '@/modules/database/components/rls-badge'
import { TableRowMenu } from '@/modules/database/components/table-row-menu'
import { isPlainTable, kindLabel } from '@/modules/database/components/table-kinds'
import { tableHref } from '@/modules/database/components/table-href'
import type { components } from '@/shared/api/api-schema'
import { formatBytes, formatCount } from '@/shared/lib/format-number'
import { RouterLink } from '@/shared/routing/router-link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'

type TableOverview = components['schemas']['TableOverview']

type TablesTableProps = { projectId: string; tables: TableOverview[] }

const NUMBER_CELL = 'text-end tabular-nums text-muted-foreground'

/** One row per table of `public`: its name opens it; size, protection and policies beside it. */
export function TablesTable({ projectId, tables }: TablesTableProps): JSX.Element {
  return (
    <Table aria-label="Tabelas do schema public">
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>RLS</TableHead>
          <TableHead className="text-end">Colunas</TableHead>
          <TableHead className="text-end">Políticas</TableHead>
          <TableHead className="text-end">Linhas (est.)</TableHead>
          <TableHead className="text-end">Tamanho</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tables.map((table) => (
          <TableRow key={table.name}>
            <TableCell className="max-w-72">
              <RouterLink
                href={tableHref(projectId, table.name)}
                className="block truncate rounded-sm font-mono text-xs font-medium text-heading underline-offset-4 hover:underline"
              >
                {table.name}
              </RouterLink>
            </TableCell>
            <TableCell className="text-muted-foreground">{kindLabel(table.kind)}</TableCell>
            <TableCell>
              <RlsBadge table={table} />
            </TableCell>
            <TableCell className={NUMBER_CELL}>{formatCount(table.columns.length)}</TableCell>
            <TableCell className={NUMBER_CELL}>{policyCount(table)}</TableCell>
            <TableCell className="text-end text-foreground tabular-nums">
              {estimatedRows(table)}
            </TableCell>
            <TableCell className={NUMBER_CELL}>{tableSize(table)}</TableCell>
            <TableCell className="py-1 text-end">
              <TableRowMenu table={table.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** The planner's estimate; a dash before the table was ever analyzed. */
function estimatedRows(table: TableOverview): string {
  const rows = table.estimated_rows

  if (rows === null || rows === undefined || rows < 0) {
    return '—'
  }

  return formatCount(rows)
}

/** Views take no space of their own. */
function tableSize(table: TableOverview): string {
  if (table.size_bytes === 0) {
    return '—'
  }

  return formatBytes(table.size_bytes)
}

/** Views and other kinds have no policies of their own. */
function policyCount(table: TableOverview): string {
  if (isPlainTable(table) === false) {
    return '—'
  }

  return formatCount(table.policies.length)
}
