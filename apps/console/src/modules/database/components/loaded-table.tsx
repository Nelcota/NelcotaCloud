import type { JSX } from 'react'
import { useState } from 'react'

import { BackToTables } from '@/modules/database/components/back-to-tables'
import { RlsOffNotice } from '@/modules/database/components/rls-off-notice'
import { TableColumnsSection } from '@/modules/database/components/table-columns-section'
import { TableIndexesSection } from '@/modules/database/components/table-indexes-section'
import { TableDangerZone } from '@/modules/database/components/table-danger-zone'
import { TableHeading } from '@/modules/database/components/table-heading'
import { TablePoliciesSection } from '@/modules/database/components/table-policies-section'
import { TableRowsSection } from '@/modules/database/components/table-rows-section'
import { type TableView, isTableView, viewsOf } from '@/modules/database/components/table-views'
import type { components } from '@/shared/api/api-schema'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

type TableOverview = components['schemas']['TableOverview']

type LoadedTableProps = {
  projectId: string
  table: TableOverview
  tables: readonly TableOverview[]
}

/** The table's page: its rows, columns, policies and settings, one tab at a time. */
export function LoadedTable(props: LoadedTableProps): JSX.Element {
  const { projectId, table } = props
  const [view, setView] = useState<TableView>('rows')

  function pickView(value: string): void {
    if (isTableView(value)) {
      setView(value)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <BackToTables projectId={projectId} />
      <TableHeading projectId={projectId} table={table} />
      <RlsOffNotice projectId={projectId} table={table} />
      <Tabs value={view} onValueChange={pickView} className="gap-4">
        <TabsList variant="line" aria-label="Seções da tabela" className="w-full">
          {viewsOf(table).map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
              <TabCount count={option.count} />
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="rows">
          <TableRowsSection projectId={projectId} table={table} />
        </TabsContent>
        <TabsContent value="columns" className="flex flex-col gap-6">
          <TableColumnsSection {...props} />
          <TableIndexesSection table={table} />
        </TabsContent>
        <TabsContent value="policies">
          <TablePoliciesSection projectId={projectId} table={table} />
        </TabsContent>
        <TabsContent value="settings">
          <TableDangerZone projectId={projectId} table={table.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TabCount({ count }: { count: number | null }): JSX.Element | null {
  if (count === null) {
    return null
  }

  return <span className="text-2xs text-muted-foreground tabular-nums">{count}</span>
}
