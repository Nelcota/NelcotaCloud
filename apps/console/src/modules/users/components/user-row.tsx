import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { BreakableEmail } from '@/modules/users/components/breakable-email'
import { UserLoginMethods } from '@/modules/users/components/user-login-methods'
import { UserActionsMenu } from '@/modules/users/components/user-actions-menu'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import { displayNameOf } from '@/modules/users/model/display-name'
import type { UsersTableProps } from '@/modules/users/components/users-table'
import {
  CELL_X,
  NARROW_ONLY,
  SELECT_CELL,
  WIDE_COLUMN,
  WIDTHS,
} from '@/modules/users/components/users-table-columns'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { RelativeTime } from '@/shared/ui/relative-time'
import { type CheckState, Checkbox } from '@/shared/ui/checkbox'
import { TableCell, TableRow } from '@/shared/ui/table'
import { UserAvatar } from '@/shared/ui/user-avatar'

type User = components['schemas']['User']

type UserRowProps = UsersTableProps & { user: User }

/**
 * The whole row opens the user: the email link stretches over it, and only the checkbox and the
 * menu sit above. The avatar anchors each row, so the eye runs down a steady left edge.
 */
export function UserRow(props: UserRowProps): JSX.Element {
  const { user, projectId, pendingUserId, onAction, selection } = props
  const name = displayNameOf(user.user_metadata)

  return (
    <TableRow
      data-state={rowState(selection.selectedIds.has(user.id))}
      className="relative has-[a:active]:bg-foreground/6 has-[a:focus-visible]:bg-foreground/[0.035]"
    >
      <TableCell className={SELECT_CELL}>
        <Checkbox
          label={`Selecionar ${user.email}`}
          state={checkState(selection.selectedIds.has(user.id))}
          onChange={(isChecked) => selection.toggle(user.id, isChecked)}
        />
      </TableCell>
      <TableCell className={cn(CELL_X, 'py-2.5 whitespace-normal')}>
        <div className="flex items-center gap-3">
          <UserAvatar
            email={user.email}
            photoUrl={null}
            tone="neutral"
            className="size-8 text-xs"
          />
          <div className="min-w-0">
            <Link
              to="/projects/$projectId/users/$userId"
              params={{ projectId, userId: user.id }}
              className="rounded-sm text-sm font-medium after:absolute after:inset-0 after:content-['']"
            >
              <BreakableEmail email={user.email} />
            </Link>
            <UserName name={name} />
            <div
              className={cn(
                NARROW_ONLY,
                'text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
              )}
            >
              <UserStatusBadges user={user} />
              <LastSignIn value={user.last_sign_in_at} />
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className={cn(CELL_X, WIDE_COLUMN, WIDTHS.login)}>
        <UserLoginMethods user={user} />
      </TableCell>
      <TableCell className={cn(CELL_X, WIDE_COLUMN, WIDTHS.lastSignIn, DATE_CELL)}>
        <LastSignIn value={user.last_sign_in_at} />
      </TableCell>
      <TableCell className={cn(CELL_X, WIDE_COLUMN, WIDTHS.status, 'text-sm')}>
        <UserStatusBadges user={user} />
      </TableCell>
      <TableCell className={cn(CELL_X, WIDE_COLUMN, WIDTHS.created, DATE_CELL)}>
        <RelativeTime value={user.created_at} />
      </TableCell>
      <TableCell className={cn(WIDTHS.actions, 'relative z-10 pr-3 text-right')}>
        <UserActionsMenu
          user={user}
          isPending={pendingUserId === user.id}
          onAction={(action) => onAction(user, action)}
        />
      </TableCell>
    </TableRow>
  )
}

const DATE_CELL = 'text-muted-foreground text-sm tabular-nums'

/** The name from the user's metadata, under the email, when they set one. */
function UserName({ name }: { name: string | null }): JSX.Element | null {
  if (name === null) {
    return null
  }

  return <p className="text-muted-foreground truncate text-xs">{name}</p>
}

/** "há 3 dias", or "Nunca entrou" for an account that never logged in. */
function LastSignIn({ value }: { value: string | null | undefined }): JSX.Element {
  if (value === null || value === undefined) {
    return <span>Nunca entrou</span>
  }

  return <RelativeTime value={value} />
}

function rowState(isSelected: boolean): 'selected' | undefined {
  if (isSelected) {
    return 'selected'
  }

  return undefined
}

function checkState(isSelected: boolean): CheckState {
  if (isSelected) {
    return 'checked'
  }

  return 'unchecked'
}
