import { SearchX } from 'lucide-react'
import type { JSX } from 'react'

import { LoadedTable } from '@/modules/database/components/loaded-table'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { RouterLink } from '@/shared/routing/router-link'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type TableRef = { projectId: string; tableName: string }

/** One table of the project, found in the schema the tables list already loaded. */
export function TableDetail({ projectId, tableName }: TableRef): JSX.Element {
  const schema = useSchemaQuery(projectId)

  if (schema.data === undefined) {
    return <TableLoading error={schema.error} onRetry={() => schema.refetch()} />
  }

  const tables = schema.data.tables
  const table = tables.find((candidate) => candidate.name === tableName)

  if (table === undefined) {
    return <TableNotFound projectId={projectId} />
  }

  return (
    <LoadedTable
      key={`${projectId}:${table.name}`}
      projectId={projectId}
      table={table}
      tables={tables}
    />
  )
}

function TableNotFound({ projectId }: { projectId: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Tabela não encontrada</h1>
      <EmptyState
        isFramed
        icon={<SearchX aria-hidden />}
        title="Tabela não encontrada"
        description="Ela foi excluída ou o link está errado."
        actions={
          <Button asChild variant="outline" size="sm">
            <RouterLink href={`/projects/${projectId}/database`}>Ver tabelas</RouterLink>
          </Button>
        }
      />
    </div>
  )
}

type TableLoadingProps = { error: Error | null; onRetry: () => void }

function TableLoading({ error, onRetry }: TableLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div role="status" aria-label="Carregando tabela" className="flex flex-col gap-5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
