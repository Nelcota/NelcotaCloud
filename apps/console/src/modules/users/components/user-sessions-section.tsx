import { LogOut, MonitorSmartphone as Monitor } from 'lucide-react'
import type { JSX } from 'react'

import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserConfirmButton } from '@/modules/users/components/user-confirm-button'
import { SessionsSkeleton } from '@/modules/users/components/user-sessions-skeleton'
import { UserSessionsTable } from '@/modules/users/components/user-sessions-table'
import { useUserSessionsQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Section } from '@/shared/ui/section'

type User = components['schemas']['User']
type UserSession = components['schemas']['UserSessions']['sessions'][number]

type UserSessionsSectionProps = { projectId: string; user: User; runner: UserActionRunner }

/** Where the user is logged in, and the way to sign every device out. */
export function UserSessionsSection({
  projectId,
  user,
  runner,
}: UserSessionsSectionProps): JSX.Element {
  const sessions = useUserSessionsQuery({ projectId, userId: user.id })
  const list = sessions.data?.sessions

  return (
    <Section
      title="Sessões ativas"
      description="Logins que ainda renovam o token, do uso mais recente ao mais antigo."
      meta={list?.length}
      action={<EndSessionsButton user={user} runner={runner} sessions={list} />}
      isFramed
    >
      <SessionsBody sessions={list} error={sessions.error} />
    </Section>
  )
}

type EndSessionsButtonProps = {
  user: User
  runner: UserActionRunner
  sessions: UserSession[] | undefined
}

function EndSessionsButton({ user, runner, sessions }: EndSessionsButtonProps): JSX.Element | null {
  if (sessions === undefined || sessions.length === 0) {
    return null
  }

  return (
    <UserConfirmButton
      action="end-sessions"
      label="Encerrar todas"
      icon={LogOut}
      email={user.email}
      runner={runner}
    />
  )
}

type SessionsBodyProps = { sessions: UserSession[] | undefined; error: Error | null }

function SessionsBody({ sessions, error }: SessionsBodyProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="p-3">
        <ErrorAlert error={error} />
      </div>
    )
  }

  if (sessions === undefined) {
    return <SessionsSkeleton />
  }

  if (sessions.length === 0) {
    return <EmptyState isCompact icon={<Monitor aria-hidden />} title="Nenhuma sessão ativa" />
  }

  return <UserSessionsTable sessions={sessions} />
}
