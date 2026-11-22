import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { unconfirmedError } from '@/modules/users/components/unconfirmed-error'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserLoading, UserNotFound } from '@/modules/users/components/user-detail-states'
import { UserDetailHeader } from '@/modules/users/components/user-detail-header'
import { UserDetailTabs } from '@/modules/users/components/user-detail-tabs'
import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
import { useUserQuery } from '@/modules/users/queries/use-user-detail'
import { type UserAction, useUserActionMutation } from '@/modules/users/queries/use-users'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { BackLink } from '@/shared/ui/back-link'
import { ErrorAlert } from '@/shared/ui/error-alert'

type User = components['schemas']['User']

type UserRef = { projectId: string; userId: string }

/** One user of the project: their account states, sessions, metadata and activity, with every action. */
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

  async function run(kind: UserAction): Promise<void> {
    await action.mutateAsync({ action: kind, userId: user.id, email: user.email })
    showFlash(`${DONE_MESSAGES[kind]}: ${user.email}`)

    if (kind === 'delete') {
      await navigate({ to: '/projects/$projectId/users', params: { projectId } })
    }
  }

  const runner: UserActionRunner = {
    pendingAction: runningAction(action.isPending, action.variables?.action),
    run,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <BackLink label="Usuários" href={`/projects/${projectId}/users`} />
        <UserDetailHeader projectId={projectId} user={user} runner={runner} />
      </div>
      <ErrorAlert error={unconfirmedError(action.error, action.variables?.action)} />
      <UserDetailTabs projectId={projectId} user={user} runner={runner} />
    </div>
  )
}

function runningAction(isPending: boolean, kind: UserAction | undefined): UserAction | null {
  if (isPending === false || kind === undefined) {
    return null
  }

  return kind
}
