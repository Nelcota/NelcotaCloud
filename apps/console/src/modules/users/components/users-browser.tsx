import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import type { UserStatusFilter as Status } from '@/modules/users/api/list-users'
import { UserCount } from '@/modules/users/components/user-count'
import { UserStatusFilter } from '@/modules/users/components/user-status-filter'
import { UsersPagination } from '@/modules/users/components/users-pagination'
import { UsersTable } from '@/modules/users/components/users-table'
import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
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
import { SearchInput } from '@/shared/ui/search-input'

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

  function changeSearch(value: string): void {
    setSearch(value)
    setOffset(0)
  }

  function changeStatus(value: Status): void {
    setStatus(value)
    setOffset(0)
  }

  async function runAction(user: User, kind: UserAction): Promise<void> {
    await action.mutateAsync({ action: kind, userId: user.id, email: user.email })
    showFlash(`${DONE_MESSAGES[kind]}: ${user.email}`)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput label="Buscar por email" value={search} onChange={changeSearch} />
        <UserStatusFilter value={status} onChange={changeStatus} />
        <div className="sm:ml-auto">
          <UserCount total={users.data?.total} />
        </div>
      </div>
      <LoadError error={users.error} onRetry={() => users.refetch()} />
      <ErrorAlert error={unblockError(action.error, action.variables)} />
      <UsersTable
        users={users.data?.users}
        projectId={projectId}
        filter={{ search: deferredSearch, status }}
        hasFailed={users.isError}
        pendingUserId={pendingUserId(action.isPending, action.variables)}
        onAction={runAction}
      />
      <UsersPagination
        offset={offset}
        pageSize={USERS_PAGE_SIZE}
        total={users.data?.total}
        onOffsetChange={setOffset}
      />
    </>
  )
}

type ActionVariables = { action: UserAction; userId: string; email: string } | undefined

/** Confirmed actions show their failure inside the dialog; only unblocking has none. */
function unblockError(error: Error | null, variables: ActionVariables): Error | null {
  if (variables?.action !== 'unban') {
    return null
  }

  return error
}

function pendingUserId(isPending: boolean, variables: ActionVariables): string | null {
  if (isPending === false || variables === undefined) {
    return null
  }

  return variables.userId
}
