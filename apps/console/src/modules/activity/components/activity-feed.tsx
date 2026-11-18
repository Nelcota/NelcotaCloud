import History from '~icons/solar/history-linear'
import type { JSX } from 'react'

import { type AuditRowContext, AuditEventRow } from '@/modules/activity/components/audit-event-row'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type AuditEvent = components['schemas']['AuditEvent']
type TeamMember = components['schemas']['TeamMember']

type ActivityFeedProps = { projectId: string; userId?: string }

/** The activity log of the project, or of one user when `userId` is given. */
export function ActivityFeed({ projectId, userId }: ActivityFeedProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, userId })
  const team = useTeamQuery(projectId)
  const events = pages.data?.pages.flatMap((page) => page.events)

  if (events === undefined) {
    return <FeedLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (events.length === 0) {
    return <NoActivity />
  }

  const context: AuditRowContext = {
    projectId,
    memberEmails: emailsById(team.data?.members ?? []),
    showsUser: userId === undefined,
  }

  return (
    <div className="grid gap-3">
      <EventList events={events} context={context} />
      <LoadError error={pages.error} onRetry={() => pages.fetchNextPage()} />
      <OlderButton
        hasMore={pages.hasNextPage}
        isLoading={pages.isFetchingNextPage}
        onLoad={() => pages.fetchNextPage()}
      />
    </div>
  )
}

function EventList(props: { events: AuditEvent[]; context: AuditRowContext }): JSX.Element {
  return (
    <ul className="bg-card divide-y rounded-xl border">
      {props.events.map((event) => (
        <AuditEventRow key={event.id} event={event} context={props.context} />
      ))}
    </ul>
  )
}

type OlderButtonProps = { hasMore: boolean; isLoading: boolean; onLoad: () => void }

function OlderButton({ hasMore, isLoading, onLoad }: OlderButtonProps): JSX.Element | null {
  if (hasMore === false) {
    return null
  }

  return (
    <Button
      variant="outline"
      className="justify-self-center"
      disabled={isLoading}
      aria-busy={isLoading}
      onClick={onLoad}
    >
      Ver mais antigos
    </Button>
  )
}

function emailsById(members: TeamMember[]): ReadonlyMap<string, string> {
  return new Map(members.map((member) => [member.account_id, member.email]))
}

function NoActivity(): JSX.Element {
  return (
    <EmptyState
      icon={History}
      title="Nenhuma atividade"
      description="Logins e ações de administradores aparecem aqui por 90 dias."
    />
  )
}

type FeedLoadingProps = { error: Error | null; onRetry: () => void }

function FeedLoading({ error, onRetry }: FeedLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return <Skeleton aria-label="Carregando atividade" className="h-48 rounded-xl" />
}
