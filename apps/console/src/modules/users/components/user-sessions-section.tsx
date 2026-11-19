import type { JSX } from 'react'

import { useUserSessionsQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime, formatRelative } from '@/shared/lib/format-date'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Skeleton } from '@/shared/ui/skeleton'

type UserSessions = components['schemas']['UserSessions']
type SessionSummary = components['schemas']['SessionSummary']

type UserRef = { projectId: string; userId: string }

/** Where the user is logged in now (its own tab); signing them out is in the page header. */
export function UserSessionsSection(ref: UserRef): JSX.Element {
  const sessions = useUserSessionsQuery(ref)

  return <SessionsCard sessions={sessions.data} error={sessions.error} />
}

type SessionsCardProps = { sessions: UserSessions | undefined; error: Error | null }

/** A failed load shows only its error, never an empty card. */
function SessionsCard({ sessions, error }: SessionsCardProps): JSX.Element {
  if (error !== null) {
    return <ErrorAlert error={error} />
  }

  return (
    <div className="surface @container overflow-hidden">
      <SessionList sessions={sessions} />
    </div>
  )
}

function SessionList({ sessions }: { sessions: UserSessions | undefined }): JSX.Element {
  if (sessions === undefined) {
    return <Skeleton className="m-4 h-4 w-56" />
  }

  if (sessions.sessions.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-6 text-center text-sm">Nenhuma sessão ativa.</p>
    )
  }

  return (
    <ul className="divide-border/60 divide-y">
      {sessions.sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </ul>
  )
}

/** One device's session: when it began, and how recently it was still in use. */
function SessionItem({ session }: { session: SessionSummary }): JSX.Element {
  const lastActive = session.last_refreshed_at

  return (
    <li className="flex flex-col gap-0.5 px-4 py-3 text-sm @md:flex-row @md:justify-between @md:gap-4">
      <span className="font-medium tabular-nums">
        Iniciada em {formatDateTime(session.started_at)}
      </span>
      <time
        dateTime={lastActive}
        title={formatDateTime(lastActive)}
        className="text-muted-foreground"
      >
        Último uso {formatRelative(lastActive)}
      </time>
    </li>
  )
}
