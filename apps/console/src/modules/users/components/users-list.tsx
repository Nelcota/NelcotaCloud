import type { JSX } from 'react'

import { type UserRowContext, UserRow } from '@/modules/users/components/user-row'
import { type UserListFilter, UsersEmptyState } from '@/modules/users/components/users-empty-state'
import { UsersSkeleton } from '@/modules/users/components/users-skeleton'
import { UsersTableHeader } from '@/modules/users/components/users-table-header'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody } from '@/shared/ui/primitives/table'

type User = components['schemas']['User']

type UsersListProps = {
  users: User[] | undefined
  context: UserRowContext
  filter: UserListFilter
  /** A failed load shows its error above the table instead of an endless skeleton. */
  hasFailed: boolean
  onClearFilter: () => void
}

/** The users as table rows, with their loading and empty states (none yet, or none for a filter). */
export function UsersList(props: UsersListProps): JSX.Element | null {
  const { users, context } = props

  if (users === undefined && props.hasFailed) {
    return null
  }

  if (users === undefined) {
    return <UsersSkeleton />
  }

  if (users.length === 0) {
    return (
      <UsersEmptyState
        projectId={context.projectId}
        filter={props.filter}
        onClearFilter={props.onClearFilter}
      />
    )
  }

  return (
    <Table>
      <UsersTableHeader />
      <TableBody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} context={context} />
        ))}
      </TableBody>
    </Table>
  )
}
