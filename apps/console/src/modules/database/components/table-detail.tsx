import SearchX from '~icons/solar/magnifier-close-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { LoadedTable } from '@/modules/database/components/loaded-table'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

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

  return <LoadedTable key={table.name} projectId={projectId} table={table} tables={tables} />
}

function TableNotFound({ projectId }: { projectId: string }): JSX.Element {
  return (
    <EmptyState
      icon={SearchX}
      title="Tabela não encontrada"
      description="Ela foi excluída ou o link está errado."
      action={
        <Link
          to="/projects/$projectId/database"
          params={{ projectId }}
          className={buttonVariants({ variant: 'outline' })}
        >
          Ver tabelas
        </Link>
      }
    />
  )
}

type TableLoadingProps = { error: Error | null; onRetry: () => void }

function TableLoading({ error, onRetry }: TableLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div aria-busy="true" aria-label="Carregando tabela" className="grid gap-6">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
