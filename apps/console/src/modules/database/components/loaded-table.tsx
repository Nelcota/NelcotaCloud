import type { JSX } from 'react'
import { useState } from 'react'

import { BackToTables } from '@/modules/database/components/back-to-tables'
import { RlsMarker } from '@/modules/database/components/rls-marker'
import { TableColumnsSection } from '@/modules/database/components/table-columns-section'
import { TableDangerZone } from '@/modules/database/components/table-danger-zone'
import {
  estimatedRowsLabel,
  isPlainTable,
  kindLabel,
} from '@/modules/database/components/table-kinds'
import { TablePoliciesSection } from '@/modules/database/components/table-policies-section'
import { TableRowsSection } from '@/modules/database/components/table-rows-section'
import { TableViewTabs } from '@/modules/database/components/table-view-tabs'
import { type TableView, viewsOf } from '@/modules/database/components/table-views'
import type { components } from '@/shared/api/api-schema'
import { PageHeader } from '@/shared/ui/page-header'

type TableOverview = components['schemas']['TableOverview']

type LoadedTableProps = {
  projectId: string
  table: TableOverview
  tables: readonly TableOverview[]
}

/** The table's page: its rows, columns and policies one view at a time, then the danger zone. */
export function LoadedTable(props: LoadedTableProps): JSX.Element {
  const { projectId, table } = props
  const [view, setView] = useState<TableView>('rows')

  return (
    <div className="grid gap-6">
      <BackToTables projectId={projectId} />
      <PageHeader title={table.name} description={<TableSummary table={table} />} />
      <TableViewTabs views={viewsOf(table)} value={view} onChange={setView} />
      <CurrentView view={view} {...props} />
      <DangerZone projectId={projectId} table={table} />
    </div>
  )
}

function TableSummary({ table }: { table: TableOverview }): JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        {kindLabel(table.kind)} · {estimatedRowsLabel(table)} linhas (estimativa)
      </span>
      <RlsMarker table={table} />
    </span>
  )
}

function CurrentView({ view, ...props }: LoadedTableProps & { view: TableView }): JSX.Element {
  if (view === 'columns') {
    return <TableColumnsSection {...props} />
  }

  if (view === 'policies') {
    return <TablePoliciesSection projectId={props.projectId} table={props.table} />
  }

  return <TableRowsSection projectId={props.projectId} table={props.table} />
}

function DangerZone({ projectId, table }: Omit<LoadedTableProps, 'tables'>): JSX.Element | null {
  if (isPlainTable(table) === false) {
    return null
  }

  return <TableDangerZone projectId={projectId} table={table.name} />
}
