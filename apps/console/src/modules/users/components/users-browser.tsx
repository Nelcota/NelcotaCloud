import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/api/list-users'
import { unconfirmedError } from '@/modules/users/components/unconfirmed-error'
import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
import { UsersFooter } from '@/modules/users/components/users-footer'
import { UsersList } from '@/modules/users/components/users-list'
import { UsersToolbar } from '@/modules/users/components/users-toolbar'
import { useAvatarKey } from '@/modules/users/queries/use-avatar-key'
import {
  USERS_PAGE_SIZE,
  type UserAction,
  useUserActionMutation,
  useUsersQuery,
} from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
import { Section } from '@/shared/ui/section'

type User = components['schemas']['User']

/** The project's users, searched by email, filtered by status and paged, with admin actions. */
export function UsersBrowser({ projectId }: { projectId: string }): JSX.Element {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [offset, setOffset] = useState(0)
  const deferredSearch = useDeferredValue(search)
  const users = useUsersQuery(projectId, {
    email: deferredSearch,
    status,
    offset,
    limit: USERS_PAGE_SIZE,
  })
  const action = useUserActionMutation(projectId)
  const avatarKey = useAvatarKey(projectId)

  function changeFilter(next: { search: string; status: Status }): void {
    setSearch(next.search)
    setStatus(next.status)
    setOffset(0)
  }

  async function runAction(user: User, kind: UserAction): Promise<void> {
    await action.mutateAsync({ action: kind, userId: user.id, email: user.email })
    showFlash(`${DONE_MESSAGES[kind]}: ${user.email}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <UsersToolbar filter={{ search, status }} total={users.data?.total} onChange={changeFilter} />
      <LoadError error={users.error} onRetry={() => users.refetch()} />
      <ErrorAlert error={unconfirmedError(action.error, action.variables?.action)} />
      <Section title="Usuários do projeto" hideHeader isFramed>
        <UsersList
          users={users.data?.users}
          context={{
            projectId,
            avatarKey,
            pendingUserId: pendingUserId(action.isPending, action.variables),
            onAction: runAction,
          }}
          filter={{ search: deferredSearch, status }}
          hasFailed={users.isError}
          onClearFilter={() => changeFilter({ search: '', status: 'all' })}
        />
        <UsersFooter offset={offset} total={users.data?.total} onOffsetChange={setOffset} />
      </Section>
    </div>
  )
}

type ActionVariables = { action: UserAction; userId: string; email: string } | undefined

function pendingUserId(isPending: boolean, variables: ActionVariables): string | null {
  if (isPending === false || variables === undefined) {
    return null
  }

  return variables.userId
}
