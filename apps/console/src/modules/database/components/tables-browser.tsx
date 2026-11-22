import type { JSX } from 'react'

import { DatabaseStats } from '@/modules/database/components/database-stats'
import { FilteredTables } from '@/modules/database/components/filtered-tables'
import { TablesEmptyState } from '@/modules/database/components/tables-empty-state'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type TableOverview = components['schemas']['TableOverview']

export function TablesBrowser({ projectId }: { projectId: string }): JSX.Element {
  const schema = useSchemaQuery(projectId)
  const tables = schema.data?.tables

  return (
    <div className="flex flex-col gap-6">
      <LoadError error={schema.error} onRetry={() => schema.refetch()} />
      <TablesContent projectId={projectId} tables={tables} hasFailed={schema.isError} />
    </div>
  )
}

type TablesContentProps = {
  projectId: string
  tables: TableOverview[] | undefined
  hasFailed: boolean
}

function TablesContent({ projectId, tables, hasFailed }: TablesContentProps): JSX.Element | null {
  if (tables === undefined && hasFailed) {
    return null
  }

  if (tables === undefined) {
    return <TablesLoading />
  }

  if (tables.length === 0) {
    return <TablesEmptyState />
  }

  return (
    <>
      <DatabaseStats tables={tables} />
      <FilteredTables projectId={projectId} tables={tables} />
    </>
  )
}

function TablesLoading(): JSX.Element {
  return (
    <div role="status" aria-label="Carregando tabelas" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 @min-[48rem]:grid-cols-4">
        <Skeleton className="h-27 rounded-xl" />
        <Skeleton className="h-27 rounded-xl" />
        <Skeleton className="h-27 rounded-xl" />
        <Skeleton className="h-27 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  )
}
