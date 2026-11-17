import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import type { UserActionProps } from '@/modules/users/components/user-account-section'
import { useUserSessionsQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

type UserSessions = components['schemas']['UserSessions']

type UserSessionsSectionProps = UserActionProps & { projectId: string }

/** Where the user is logged in, when they last logged in, and the way to sign them out. */
export function UserSessionsSection(props: UserSessionsSectionProps): JSX.Element {
  const { user } = props
  const sessions = useUserSessionsQuery({ projectId: props.projectId, userId: user.id })

  return (
    <SettingsSection
      title="Sessões ativas"
      description={<LastSignIn sessions={sessions.data} />}
      footer={endSessionsFooter({ ...props, sessions: sessions.data })}
    >
      <ErrorAlert error={sessions.error} />
      <SessionList sessions={sessions.data} hasFailed={sessions.isError} />
    </SettingsSection>
  )
}

function LastSignIn({ sessions }: { sessions: UserSessions | undefined }): JSX.Element | null {
  if (sessions === undefined) {
    return null
  }

  const lastSignIn = sessions.last_sign_in_at

  if (lastSignIn === null || lastSignIn === undefined) {
    return <>Nunca entrou no app.</>
  }

  return <>Último login em {formatDateTime(lastSignIn)}.</>
}

type SessionListProps = { sessions: UserSessions | undefined; hasFailed: boolean }

function SessionList({ sessions, hasFailed }: SessionListProps): JSX.Element | null {
  if (hasFailed) {
    return null
  }

  if (sessions === undefined) {
    return <Skeleton className="h-16 rounded-lg" />
  }

  if (sessions.sessions.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma sessão ativa.</p>
  }

  return (
    <ul className="divide-y rounded-lg border">
      {sessions.sessions.map((session) => (
        <li key={session.id} className="px-4 py-3 text-sm">
          <p className="font-medium">Entrou em {formatDateTime(session.started_at)}</p>
          <p className="text-muted-foreground">
            Ativa pela última vez em {formatDateTime(session.last_refreshed_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}

type EndSessionsProps = UserActionProps & { sessions: UserSessions | undefined }

/** Only offered while there is a session to end; without one the section has no footer. */
function endSessionsFooter(props: EndSessionsProps): JSX.Element | undefined {
  const { user, sessions } = props

  if (sessions === undefined || sessions.sessions.length === 0) {
    return undefined
  }

  return (
    <ConfirmedActionButton
      action="end-sessions"
      email={user.email}
      isPending={props.pendingAction === 'end-sessions'}
      onConfirm={() => props.onAction('end-sessions')}
    />
  )
}
