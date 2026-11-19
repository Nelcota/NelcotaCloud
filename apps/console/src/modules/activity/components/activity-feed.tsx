import History from '~icons/solar/history-linear'
import type { JSX } from 'react'
import { useCallback, useRef, useState } from 'react'

import { ActivityTable } from '@/modules/activity/components/activity-table'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { EventDetailSheet } from '@/modules/activity/components/event-detail-sheet'
import { useLoadWhenVisible } from '@/modules/activity/components/use-load-when-visible'
import { emailsById } from '@/modules/activity/components/member-emails'
import { RETENTION_DAYS } from '@/modules/activity/model/activity-period'
import type { ActivityFilter } from '@/modules/activity/model/activity-search'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type AuditEvent = components['schemas']['AuditEvent']

/** The page's filter and the way to change it; without it the feed lists everything. */
export type FeedFiltering = { filter: ActivityFilter; onChange: (filter: ActivityFilter) => void }

type ActivityFeedProps = { projectId: string; userId?: string; filtering?: FeedFiltering }

/** The activity log of the project, or of one user when `userId` is given. */
export function ActivityFeed({ projectId, userId, filtering }: ActivityFeedProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, userId, filter: filtering?.filter })
  const team = useTeamQuery(projectId)
  const [openEvent, setOpenEvent] = useState<AuditEvent | null>(null)
  const events = pages.data?.pages.flatMap((page) => page.events)

  if (events === undefined) {
    return <FeedLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (events.length === 0) {
    return <NoActivity filtering={filtering} />
  }

  const context: AuditRowContext = {
    projectId,
    memberEmails: emailsById(team.data?.members ?? []),
    showsUser: userId === undefined,
    onSearch: searchHandler(filtering),
    onOpen: setOpenEvent,
  }

  // While a new filter loads, the previous list stays, dimmed and marked busy.
  return (
    <div className="grid gap-3">
      <div
        aria-busy={pages.isPlaceholderData}
        className="surface overflow-hidden transition-opacity aria-busy:opacity-60"
      >
        <ActivityTable events={events} context={context} />
      </div>
      <LoadError error={pages.error} onRetry={() => pages.fetchNextPage()} />
      <OlderButton
        hasMore={pages.hasNextPage}
        isLoading={pages.isFetchingNextPage}
        onLoad={() => pages.fetchNextPage()}
        endText={listEndText(filtering)}
      />
      <EventDetailSheet event={openEvent} context={context} onClose={() => setOpenEvent(null)} />
    </div>
  )
}

/** Where the list stops: the chosen period, or the log's own 90-day window. */
function listEndText(filtering: FeedFiltering | undefined): string {
  if (filtering === undefined || filtering.filter.period === RETENTION_DAYS) {
    return 'Fim do histórico: eventos ficam guardados por 90 dias.'
  }

  return 'Fim do período escolhido.'
}

function searchHandler(filtering: FeedFiltering | undefined): ((text: string) => void) | undefined {
  if (filtering === undefined) {
    return undefined
  }

  return (text) => filtering.onChange({ ...filtering.filter, search: text })
}

type OlderButtonProps = {
  hasMore: boolean
  isLoading: boolean
  onLoad: () => void
  endText: string
}

/** Older pages on demand; at the end, says where the list stops. */
function OlderButton({ hasMore, isLoading, onLoad, endText }: OlderButtonProps): JSX.Element {
  if (hasMore === false) {
    return <p className="text-muted-foreground text-center text-sm">{endText}</p>
  }

  return <AutoLoadButton isLoading={isLoading} onLoad={onLoad} />
}

/** Loads by itself when scrolled to; still a button, for keyboards and to retry a failure. */
function AutoLoadButton({
  isLoading,
  onLoad,
}: Omit<OlderButtonProps, 'hasMore' | 'endText'>): JSX.Element {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const loadIfIdle = useCallback(() => {
    if (isLoading) {
      return
    }

    onLoad()
  }, [isLoading, onLoad])
  useLoadWhenVisible(buttonRef, loadIfIdle)

  return (
    <Button
      ref={buttonRef}
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

function NoActivity({ filtering }: { filtering?: FeedFiltering }): JSX.Element {
  if (filtering === undefined || isUnfiltered(filtering.filter)) {
    return (
      <EmptyState
        icon={History}
        title="Nenhuma atividade"
        description="Logins e ações de administradores aparecem aqui por 90 dias."
      />
    )
  }

  return (
    <div className="grid justify-items-center gap-3 py-12 text-center text-sm">
      <p className="text-muted-foreground">Nenhum evento com esses filtros neste período.</p>
      <Button
        variant="outline"
        onClick={() => filtering.onChange({ ...filtering.filter, kind: 'all', search: '' })}
      >
        Limpar filtros
      </Button>
    </div>
  )
}

function isUnfiltered(filter: ActivityFilter): boolean {
  return filter.kind === 'all' && filter.search.trim() === ''
}

type FeedLoadingProps = { error: Error | null; onRetry: () => void }

function FeedLoading({ error, onRetry }: FeedLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return <Skeleton aria-label="Carregando atividade" className="h-48 rounded-2xl" />
}
