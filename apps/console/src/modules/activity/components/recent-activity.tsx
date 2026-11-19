import { Link } from '@tanstack/react-router'
import type { JSX, ReactNode } from 'react'
import { useId, useState } from 'react'

import { ActivityTable } from '@/modules/activity/components/activity-table'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { EventDetailSheet } from '@/modules/activity/components/event-detail-sheet'
import { emailsById } from '@/modules/activity/components/member-emails'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type AuditEvent = components['schemas']['AuditEvent']

const RECENT_LIMIT = 5

type RecentActivityProps = {
  projectId: string
  /** Only this user's events (their page); the whole project's otherwise. */
  userId?: string
  /** The way to the full log; the project's activity page when not given. */
  seeAll?: ReactNode
}

/** The latest few events of the project, or of one user, with the way to the full log. */
export function RecentActivity({ projectId, userId, seeAll }: RecentActivityProps): JSX.Element {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="surface flex flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
        <h2 id={headingId} className="text-base">
          Atividade recente
        </h2>
        {seeAll ?? <ProjectActivityLink projectId={projectId} />}
      </header>
      <div className="pt-2">
        <RecentEvents projectId={projectId} userId={userId} />
      </div>
    </section>
  )
}

function ProjectActivityLink({ projectId }: { projectId: string }): JSX.Element {
  return (
    <Link
      to="/projects/$projectId/activity"
      params={{ projectId }}
      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
    >
      Ver tudo
    </Link>
  )
}

type RecentEventsProps = { projectId: string; userId?: string }

function RecentEvents({ projectId, userId }: RecentEventsProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, userId })
  const team = useTeamQuery(projectId)
  const [openEvent, setOpenEvent] = useState<AuditEvent | null>(null)
  const events = pages.data?.pages[0]?.events.slice(0, RECENT_LIMIT)

  if (events === undefined) {
    return <EventsLoading error={pages.error} onRetry={() => pages.refetch()} />
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-10 text-center text-sm">
        Logins e ações de administradores aparecem aqui.
      </p>
    )
  }

  const context: AuditRowContext = {
    projectId,
    memberEmails: emailsById(team.data?.members ?? []),
    showsUser: userId === undefined,
    onOpen: setOpenEvent,
  }

  return (
    <>
      <ActivityTable events={events} context={context} />
      <EventDetailSheet event={openEvent} context={context} onClose={() => setOpenEvent(null)} />
    </>
  )
}

type EventsLoadingProps = { error: Error | null; onRetry: () => void }

function EventsLoading({ error, onRetry }: EventsLoadingProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="px-3 py-2">
        <LoadError error={error} onRetry={onRetry} />
      </div>
    )
  }

  return <Skeleton aria-label="Carregando atividade" className="mx-3 my-2 h-40 rounded-xl" />
}
