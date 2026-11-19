import type { JSX } from 'react'
import { useDeferredValue, useRef, useState } from 'react'

import { DONE_MESSAGES } from '@/modules/users/components/user-done-messages'
import { useUserSelection } from '@/modules/users/components/use-user-selection'
import { UsersPagination } from '@/modules/users/components/users-pagination'
import { UsersTable } from '@/modules/users/components/users-table'
import { UsersToolbar } from '@/modules/users/components/users-toolbar'
import { VisibleErrorAlert } from '@/modules/users/components/visible-error-alert'
import type { UserOrder, UsersFilter } from '@/modules/users/model/users-search'
import {
  USERS_PAGE_SIZE,
  type UserAction,
  useMatchingUserCountQuery,
  useUserActionMutation,
  useUsersQuery,
} from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'
import { LoadError } from '@/shared/ui/load-error'

type User = components['schemas']['User']

type UsersBrowserProps = {
  projectId: string
  /** From the URL, so Back from a user returns to the same list and page. */
  filter: UsersFilter
  onFilterChange: (filter: UsersFilter) => void
}

/** The project's users, searched by email, filtered by status and paged, with admin actions. */
export function UsersBrowser({
  projectId,
  filter,
  onFilterChange,
}: UsersBrowserProps): JSX.Element {
  // The field keeps its own text: the URL updates a moment later and would move the cursor.
  const [search, setSearch] = useState(filter.search)
  const deferredSearch = useDeferredValue(search)
  const listTop = useRef<HTMLDivElement>(null)
  const { status, order, cursors } = filter
  const users = useUsersQuery(projectId, {
    email: deferredSearch,
    status,
    order,
    before: cursors.at(-1),
    limit: USERS_PAGE_SIZE,
  })
  const matching = useMatchingUserCountQuery(projectId, { email: deferredSearch, status })
  const allStatuses = useMatchingUserCountQuery(projectId, { email: deferredSearch, status: 'all' })
  const action = useUserActionMutation(projectId)
  const pageUsers = users.data?.users ?? []
  const selection = useUserSelection(pageUsers.map((user) => user.id))
  const isSettling = users.isPlaceholderData || search !== deferredSearch

  /** A new search, status or order starts again on the first page. */
  function changeFilter(next: Pick<UsersFilter, 'search' | 'status'>): void {
    setSearch(next.search)
    onFilterChange({ ...next, order, cursors: [] })
  }

  function changeOrder(next: UserOrder): void {
    onFilterChange({ search, status, order: next, cursors: [] })
  }

  /** Paging keeps the search and brings the top of the list back into view. */
  function showPage(nextCursors: readonly string[]): void {
    onFilterChange({ search, status, order, cursors: nextCursors })
    listTop.current?.scrollIntoView({ block: 'start' })
  }

  function showOlder(): void {
    const next = users.data?.next_cursor

    if (typeof next !== 'string' || isSettling) {
      return
    }

    showPage([...cursors, next])
  }

  async function runAction(user: User, kind: UserAction): Promise<void> {
    await action.mutateAsync({ action: kind, userId: user.id, email: user.email })
    showFlash(`${DONE_MESSAGES[kind]}: ${user.email}`)
  }

  // The toolbar, the table and its footer read as one unit: 12px apart, under the page header.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <UsersToolbar
        ref={listTop}
        projectId={projectId}
        filter={{ search, status }}
        onFilterChange={changeFilter}
        selectedUsers={pageUsers.filter((user) => selection.selectedIds.has(user.id))}
        selection={selection}
      />
      <LoadError error={users.error} onRetry={() => users.refetch()} />
      <VisibleErrorAlert error={unconfirmedError(action.error, action.variables)} />
      <UsersTable
        users={users.data?.users}
        projectId={projectId}
        filter={{ search: deferredSearch, status }}
        onFilterChange={changeFilter}
        hasFailed={users.isError}
        pendingUserId={pendingUserId(action.isPending, action.variables)}
        onAction={runAction}
        selection={selection}
        order={order}
        onOrderChange={changeOrder}
        allStatusCount={allStatuses.data}
        footer={
          <UsersPagination
            page={cursors.length + 1}
            shownCount={pageUsers.length}
            total={matching.data}
            hasNext={typeof users.data?.next_cursor === 'string'}
            isPending={isSettling}
            onPrevious={() => showPage(cursors.slice(0, -1))}
            onNext={showOlder}
          />
        }
      />
    </div>
  )
}

type ActionVariables = { action: UserAction; userId: string; email: string } | undefined

/** Confirmed actions show their failure inside the dialog; these two run without one. */
function unconfirmedError(error: Error | null, variables: ActionVariables): Error | null {
  if (variables?.action === 'unban' || variables?.action === 'resend-verification') {
    return error
  }

  return null
}

function pendingUserId(isPending: boolean, variables: ActionVariables): string | null {
  if (isPending === false || variables === undefined) {
    return null
  }

  return variables.userId
}
