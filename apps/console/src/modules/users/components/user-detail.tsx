import SearchX from '~icons/solar/magnifier-close-linear'
import { Link, useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { UserDetailSkeleton } from '@/modules/users/components/user-detail-skeleton'
import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
import { UserHeader } from '@/modules/users/components/user-header'
import { type UserActivityViews, UserTabs } from '@/modules/users/components/user-tabs'
import type { UserTab } from '@/modules/users/model/user-detail-search'
import { useUserQuery } from '@/modules/users/queries/use-user-detail'
import { type UserAction, useUserActionMutation } from '@/modules/users/queries/use-users'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'

type User = components['schemas']['User']

/** What the page's URL decides: which tab is open, and how to open another. */
export type UserDetailView = { tab: UserTab; onTabChange: (tab: UserTab) => void }

type UserDetailProps = {
  projectId: string
  userId: string
  view: UserDetailView
  activity: UserActivityViews
}

/** One user of the project: who they are and where they stand, then their details in tabs. */
export function UserDetail(props: UserDetailProps): JSX.Element {
  return (
    // Wide, so the overview's account details and recent activity sit side by side.
    <div data-wide-page className="@container mx-auto grid w-full max-w-6xl">
      <UserDetailContent {...props} />
    </div>
  )
}

function UserDetailContent(props: UserDetailProps): JSX.Element {
  const { projectId, userId } = props
  const user = useUserQuery({ projectId, userId })

  if (user.error instanceof ApiError && user.error.status === 404) {
    return <UserNotFound projectId={projectId} />
  }

  if (user.data === undefined) {
    return <UserLoading error={user.error} onRetry={() => user.refetch()} />
  }

  return <LoadedUser {...props} user={user.data} />
}

type LoadedUserProps = UserDetailProps & { user: User }

function LoadedUser({ projectId, user, view, activity }: LoadedUserProps): JSX.Element {
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

  // 32px between the header and the tabs; each tab sets its own rhythm inside.
  return (
    <div className="grid gap-8">
      <UserHeader projectId={projectId} {...actionProps} />
      <ErrorAlert error={unconfirmedError(action.error, action.variables?.action)} />
      <UserTabs projectId={projectId} {...actionProps} {...view} activity={activity} />
    </div>
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

  return <UserDetailSkeleton />
}
