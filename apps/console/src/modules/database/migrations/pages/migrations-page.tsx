import Migration from '~icons/solar/document-text-linear'
import type { JSX } from 'react'

import { MigrationHistoryTable } from '@/modules/database/migrations/components/migration-history-table'
import { useMigrationHistoryQuery } from '@/modules/database/migrations/queries/use-migration-history-query'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

export function MigrationsPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Migrações"
        description="Histórico de alterações SQL versionadas deste banco."
      />
      <History projectId={projectId} />
    </div>
  )
}

function History({ projectId }: { projectId: string }): JSX.Element {
  const history = useMigrationHistoryQuery(projectId)
  const team = useTeamQuery(projectId)
  const migrations = history.data?.pages.flatMap((page) => page.migrations) ?? []

  if (history.isPending) {
    return <Skeleton aria-label="Carregando migrações" className="h-40 rounded-xl" />
  }

  if (history.isError && migrations.length === 0) {
    return <LoadError error={history.error} onRetry={() => history.refetch()} />
  }

  if (migrations.length === 0) {
    return (
      <EmptyState
        icon={Migration}
        title="Nenhuma migração aplicada"
        description="Aplique o primeiro arquivo SQL pela API de migrações no seu CI."
      />
    )
  }

  const memberEmails = new Map(
    team.data?.members.map((member) => [member.account_id, member.email]),
  )

  return (
    <div className="grid min-w-0 gap-3">
      <MigrationHistoryTable migrations={migrations} memberEmails={memberEmails} />
      <HistoryControls history={history} />
    </div>
  )
}

function HistoryControls({
  history,
}: {
  history: ReturnType<typeof useMigrationHistoryQuery>
}): JSX.Element | null {
  if (history.isFetchNextPageError) {
    return <LoadError error={history.error} onRetry={() => history.fetchNextPage()} />
  }

  if (history.isError) {
    return <LoadError error={history.error} onRetry={() => history.refetch()} />
  }

  if (history.hasNextPage === false) {
    return null
  }

  return (
    <Button
      variant="outline"
      className="justify-self-center"
      disabled={history.isFetching}
      aria-busy={history.isFetchingNextPage}
      onClick={() => history.fetchNextPage()}
    >
      Ver migrações anteriores
    </Button>
  )
}
