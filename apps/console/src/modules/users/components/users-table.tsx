import Calendar from '~icons/solar/calendar-linear'
import Letter from '~icons/solar/letter-linear'
import ShieldCheck from '~icons/solar/shield-check-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { UserActionsMenu } from '@/modules/users/components/user-actions-menu'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import { type UserListFilter, UsersEmptyState } from '@/modules/users/components/users-empty-state'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { Skeleton } from '@/shared/ui/skeleton'
import { ColumnLabel } from '@/shared/ui/column-label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type User = components['schemas']['User']

const SKELETON_ROWS = ['a', 'b', 'c', 'd']

type UsersTableProps = {
  users: User[] | undefined
  projectId: string
  filter: UserListFilter
  /** A failed load shows its error above the table instead of an endless skeleton. */
  hasFailed: boolean
  /** The user whose action is running; only that row's menu waits. */
  pendingUserId: string | null
  onAction: (user: User, action: UserAction) => Promise<void>
}

/** The users list, with its loading and empty states (no users yet, or none for a filter). */
export function UsersTable(props: UsersTableProps): JSX.Element | null {
  const { users } = props

  if (users === undefined && props.hasFailed) {
    return null
  }

  if (users === undefined) {
    return <UsersSkeleton />
  }

  if (users.length === 0) {
    return <UsersEmptyState filter={props.filter} />
  }

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">
              <ColumnLabel icon={Letter}>Email</ColumnLabel>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <ColumnLabel icon={ShieldCheck}>Situação</ColumnLabel>
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <ColumnLabel icon={Calendar}>Criado em</ColumnLabel>
            </TableHead>
            <TableHead className="w-12 px-4">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              {/* `w-full max-w-0` gives the email the free width; it wraps, never truncates. */}
              <TableCell className="w-full max-w-0 px-4 whitespace-normal">
                <Link
                  to="/projects/$projectId/users/$userId"
                  params={{ projectId: props.projectId, userId: user.id }}
                  className="font-medium break-all underline-offset-4 hover:underline"
                >
                  {user.email}
                </Link>
                <div className="mt-1.5 sm:hidden">
                  <UserStatusBadges user={user} />
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <UserStatusBadges user={user} />
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell className="px-4 text-right">
                <UserActionsMenu
                  user={user}
                  isPending={props.pendingUserId === user.id}
                  onAction={(action) => props.onAction(user, action)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function UsersSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando usuários"
      className="grid gap-px overflow-hidden rounded-xl border"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="bg-card flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ))}
    </div>
  )
}
