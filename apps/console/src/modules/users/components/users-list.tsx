import type { JSX } from 'react'

import { type UserRowContext, UserRow } from '@/modules/users/components/user-row'
import { type UserListFilter, UsersEmptyState } from '@/modules/users/components/users-empty-state'
import { UsersSkeleton } from '@/modules/users/components/users-skeleton'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

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
  const { users } = props

  if (users === undefined && props.hasFailed) {
    return null
  }

  if (users === undefined) {
    return <UsersSkeleton />
  }

  if (users.length === 0) {
    return <UsersEmptyState filter={props.filter} onClearFilter={props.onClearFilter} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9">Usuário</TableHead>
          <TableHead className="hidden h-9 md:table-cell">ID</TableHead>
          <TableHead className="hidden h-9 lg:table-cell">Entra com</TableHead>
          <TableHead className="h-9">Situação</TableHead>
          <TableHead className="hidden h-9 xl:table-cell">Criado em</TableHead>
          <TableHead className="hidden h-9 sm:table-cell">Último login</TableHead>
          <TableHead className="h-9 w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} context={props.context} />
        ))}
      </TableBody>
    </Table>
  )
}
