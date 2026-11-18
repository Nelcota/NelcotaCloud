import Database from '~icons/solar/database-linear'
import type { JSX } from 'react'

import { TablesTable } from '@/modules/database/components/tables-table'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type TableOverview = components['schemas']['TableOverview']

/** The project's tables, with their loading, error and empty states. */
export function TablesBrowser({ projectId }: { projectId: string }): JSX.Element {
  const schema = useSchemaQuery(projectId)

  return (
    <>
      <LoadError error={schema.error} onRetry={() => schema.refetch()} />
      <TablesContent
        projectId={projectId}
        tables={schema.data?.tables}
        hasFailed={schema.isError}
      />
    </>
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
    return <Skeleton className="h-40 rounded-xl" />
  }

  if (tables.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="Nenhuma tabela"
        description="Crie a primeira tabela aqui ou pelo editor SQL."
      />
    )
  }

  return <TablesTable projectId={projectId} tables={tables} />
}
