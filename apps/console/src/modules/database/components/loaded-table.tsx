import { Tabs as TabsPrimitive } from 'radix-ui'
import type { JSX } from 'react'
import { useState } from 'react'

import { BackToTables } from '@/modules/database/components/back-to-tables'
import { RlsOffNotice } from '@/modules/database/components/rls-off-notice'
import { TableColumnsSection } from '@/modules/database/components/table-columns-section'
import { TableDangerZone } from '@/modules/database/components/table-danger-zone'
import { TableHeading } from '@/modules/database/components/table-heading'
import { TablePoliciesSection } from '@/modules/database/components/table-policies-section'
import { TableRowsSection } from '@/modules/database/components/table-rows-section'
import { type TableView, isTableView, viewsOf } from '@/modules/database/components/table-views'
import type { components } from '@/shared/api/api-schema'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

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
    <div className="flex flex-col gap-6">
      <BackToTables projectId={projectId} />
      <TableHeading projectId={projectId} table={table} />
      <RlsOffNotice projectId={projectId} table={table} />
      <Tabs value={view} onValueChange={pickView} className="gap-4">
        <div className="scrollbar-thin overflow-x-auto border-b">
          <TabsList variant="line" aria-label="Seções da tabela">
            {viewsOf(table).map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-2.5">
                {option.label}
                <TabCount count={option.count} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsPrimitive.Content value="rows" className="outline-none">
          <TableRowsSection projectId={projectId} table={table} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="columns" className="outline-none">
          <TableColumnsSection {...props} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="policies" className="outline-none">
          <TablePoliciesSection projectId={projectId} table={table} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="settings" className="outline-none">
          <TableDangerZone projectId={projectId} table={table.name} />
        </TabsPrimitive.Content>
      </Tabs>
    </div>
  )
}

function TabCount({ count }: { count: number | null }): JSX.Element | null {
  if (count === null) {
    return null
  }

  return <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
}
