import ArrowLeft from '~icons/solar/arrow-left-linear'
import SearchX from '~icons/solar/magnifier-close-linear'
import { Link, useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { UserAccountSection } from '@/modules/users/components/user-account-section'
import { UserDangerZone } from '@/modules/users/components/user-danger-zone'
import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
import { UserIdentitiesSection } from '@/modules/users/components/user-identities-section'
import { UserMetadataSection } from '@/modules/users/components/user-metadata-section'
import { UserSessionsSection } from '@/modules/users/components/user-sessions-section'
import { useUserQuery } from '@/modules/users/queries/use-user-detail'
import { type UserAction, useUserActionMutation } from '@/modules/users/queries/use-users'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { showFlash } from '@/shared/lib/flash-notice'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type User = components['schemas']['User']

type UserRef = { projectId: string; userId: string }

/** One user of the project: their account states, social logins and sessions, with every action. */
export function UserDetail(ref: UserRef): JSX.Element {
  const user = useUserQuery(ref)

  if (user.error instanceof ApiError && user.error.status === 404) {
    return <UserNotFound projectId={ref.projectId} />
  }

  if (user.data === undefined) {
    return <UserLoading error={user.error} onRetry={() => user.refetch()} />
  }

  return <LoadedUser projectId={ref.projectId} user={user.data} />
}

function LoadedUser({ projectId, user }: { projectId: string; user: User }): JSX.Element {
  const navigate = useNavigate()
  const action = useUserActionMutation(projectId)
  const pendingAction = runningAction(action.isPending, action.variables?.action)

  async function runAction(kind: UserAction): Promise<void> {
    await action.mutateAsync({ action: kind, userId: user.id, email: user.email })
    showFlash(`${DONE_MESSAGES[kind]}: ${user.email}`)

    if (kind === 'delete') {
      await navigate({ to: '/projects/$projectId/users', params: { projectId } })
    }
  }

  const actionProps = { user, pendingAction, onAction: runAction }

  return (
    <div className="grid gap-6">
      <BackToUsers projectId={projectId} />
      <PageHeader title={user.email} description={`Criado em ${formatDate(user.created_at)}`} />
      <ErrorAlert error={unconfirmedError(action.error, action.variables?.action)} />
      <UserAccountSection {...actionProps} />
      <UserSessionsSection projectId={projectId} {...actionProps} />
      <UserIdentitiesSection projectId={projectId} userId={user.id} />
      <UserMetadataSection key={user.id} projectId={projectId} user={user} />
      <UserDangerZone {...actionProps} />
    </div>
  )
}

function BackToUsers({ projectId }: { projectId: string }): JSX.Element {
  return (
    <Link
      to="/projects/$projectId/users"
      params={{ projectId }}
      className="text-muted-foreground hover:text-foreground -mb-3 flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Usuários
    </Link>
  )
}

function runningAction(isPending: boolean, kind: UserAction | undefined): UserAction | null {
  if (isPending === false || kind === undefined) {
    return null
  }

  return kind
}

/** Confirmed actions show their failure inside the dialog; these two have none. */
function unconfirmedError(error: Error | null, kind: UserAction | undefined): Error | null {
  if (kind === 'unban' || kind === 'resend-verification') {
    return error
  }

  return null
}

function UserNotFound({ projectId }: { projectId: string }): JSX.Element {
  return (
    <EmptyState
      icon={SearchX}
      title="Usuário não encontrado"
      description="A conta foi excluída ou o link está errado."
      action={
        <Link
          to="/projects/$projectId/users"
          params={{ projectId }}
          className={buttonVariants({ variant: 'outline' })}
        >
          Ver usuários
        </Link>
      }
    />
  )
}

type UserLoadingProps = { error: Error | null; onRetry: () => void }

function UserLoading({ error, onRetry }: UserLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div aria-busy="true" aria-label="Carregando usuário" className="grid gap-6">
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}
