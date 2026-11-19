import Database from '~icons/solar/database-linear'
import type { JSX } from 'react'

import { isPlainTable } from '@/modules/database/components/table-kinds'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { OverviewCard } from '@/modules/overview/components/overview-card'
import { countOrNull } from '@/modules/overview/components/overview-metrics'
import type { components } from '@/shared/api/api-schema'

type SchemaOverview = components['schemas']['SchemaOverview']

/** The project's own tables in `public`, served by the Data API. */
export function TablesCard({ projectId }: { projectId: string }): JSX.Element {
  const schema = useSchemaQuery(projectId)
  const tables = schema.data?.tables.filter(isPlainTable)

  return (
    <OverviewCard
      icon={Database}
      label="Tabelas"
      value={countOrNull(tables?.length)}
      error={schema.error}
      onRetry={() => schema.refetch()}
      detail={schemaDetail(schema.data)}
      to={`/projects/${projectId}/database`}
    />
  )
}

function schemaDetail(schema: SchemaOverview | undefined): string | null {
  if (schema === undefined) {
    return null
  }

  const views = schema.tables.filter((table) => isPlainTable(table) === false).length

  return `${views} views · ${schema.functions.length} funções`
}
