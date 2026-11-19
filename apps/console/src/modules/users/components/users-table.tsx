import type { JSX, ReactNode } from 'react'

import { SortableHead } from '@/modules/users/components/sortable-head'
import { UserRow } from '@/modules/users/components/user-row'
import type { UserSelection } from '@/modules/users/components/use-user-selection'
import { type UserListFilter, UsersEmptyState } from '@/modules/users/components/users-empty-state'
import { UsersSkeleton } from '@/modules/users/components/users-skeleton'
import {
  HEAD_CLASS,
  SELECT_CELL,
  WIDE_COLUMN,
  WIDTHS,
} from '@/modules/users/components/users-table-columns'
import type { UserOrder } from '@/modules/users/model/users-search'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { Checkbox } from '@/shared/ui/checkbox'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { TABLE_HEADER_TINT } from '@/shared/ui/table-styles'

type User = components['schemas']['User']

export type UsersTableProps = {
  users: User[] | undefined
  projectId: string
  filter: UserListFilter
  onFilterChange: (filter: UserListFilter) => void
  /** A failed load shows its error above the table instead of an endless skeleton. */
  hasFailed: boolean
  /** The user whose action is running; only that row's menu waits. */
  pendingUserId: string | null
  onAction: (user: User, action: UserAction) => Promise<void>
  selection: UserSelection
  order: UserOrder
  onOrderChange: (order: UserOrder) => void
  /** Users matching the search in any status, for the empty state's way out. */
  allStatusCount: number | undefined
  /** The range and paging, closing the same card as the rows they count. */
  footer: ReactNode
}

/** The users list, with its loading and empty states (no users yet, or none for a filter). */
export function UsersTable(props: UsersTableProps): JSX.Element | null {
  const { users } = props
  const sorting = { order: props.order, onOrderChange: props.onOrderChange }

  if (users === undefined && props.hasFailed) {
    return null
  }

  if (users === undefined) {
    return <UsersSkeleton />
  }

  if (users.length === 0) {
    return (
      <UsersEmptyState
        filter={props.filter}
        onFilterChange={props.onFilterChange}
        allStatusCount={props.allStatusCount}
        projectId={props.projectId}
      />
    )
  }

  return (
    <div className="surface @container overflow-hidden">
      <Table aria-label="Usuários" className="@2xl:table-fixed">
        <TableHeader className={TABLE_HEADER_TINT}>
          <TableRow>
            <TableHead className={SELECT_CELL}>
              <Checkbox
                label="Selecionar todos os usuários desta página"
                state={props.selection.headerState}
                onChange={props.selection.toggleAll}
              />
            </TableHead>
            <TableHead className={HEAD_CLASS}>Usuário</TableHead>
            <TableHead className={cn(HEAD_CLASS, WIDE_COLUMN, WIDTHS.login)}>Login</TableHead>
            <SortableHead
              {...sorting}
              sortsBy="last_sign_in"
              className={cn(HEAD_CLASS, WIDE_COLUMN, WIDTHS.lastSignIn)}
            >
              Último login
            </SortableHead>
            <TableHead className={cn(HEAD_CLASS, WIDE_COLUMN, WIDTHS.status)}>Situação</TableHead>
            <SortableHead
              {...sorting}
              sortsBy="created_at"
              className={cn(HEAD_CLASS, WIDE_COLUMN, WIDTHS.created)}
            >
              Criado em
            </SortableHead>
            <TableHead className={WIDTHS.actions}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} {...props} />
          ))}
        </TableBody>
      </Table>
      {props.footer}
    </div>
  )
}
