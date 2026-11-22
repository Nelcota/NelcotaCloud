import type { JSX } from 'react'

import { signInMethods } from '@/modules/users/components/sign-in-methods'
import { UserActionsMenu } from '@/modules/users/components/user-actions-menu'
import { userAvatarUrl } from '@/modules/users/components/user-avatar-url'
import { UserShortId } from '@/modules/users/components/user-short-id'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import { USER_COLUMN_VISIBILITY as COLUMNS } from '@/modules/users/components/user-columns'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'
import { Avatar } from '@/shared/ui/avatar'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type User = components['schemas']['User']

export type UserRowContext = {
  projectId: string
  avatarKey: string | null
  /** The user whose action is running; only that row's menu waits. */
  pendingUserId: string | null
  onAction: (user: User, action: UserAction) => Promise<void>
}

type UserRowProps = { user: User; context: UserRowContext }

/** One account as a table row; the email is the link to the user's page. */
export function UserRow({ user, context }: UserRowProps): JSX.Element {
  const methods = signInMethods(user).join(' · ')

  return (
    <TableRow>
      <TableCell>
        <div className="flex max-w-80 min-w-0 items-center gap-2.5">
          <Avatar
            name={user.email}
            src={userAvatarUrl(user, context.avatarKey) ?? undefined}
            size="sm"
          />
          <RouterLink
            href={`/projects/${context.projectId}/users/${user.id}`}
            className="min-w-0 truncate rounded-sm font-medium text-foreground hover:underline"
          >
            {user.email}
          </RouterLink>
        </div>
      </TableCell>
      <TableCell className={cn('py-1', COLUMNS.id)}>
        <UserShortId id={user.id} />
      </TableCell>
      <TableCell className={cn('text-muted-foreground', COLUMNS.methods)}>
        <span title={methods} className="block max-w-48 truncate">
          {methods}
        </span>
      </TableCell>
      <TableCell>
        <UserStatusBadges user={user} showsConfirmed />
      </TableCell>
      <TableCell className={cn('text-muted-foreground', COLUMNS.createdAt)}>
        <Timestamp value={user.created_at} format="relative" />
      </TableCell>
      <TableCell className={cn('text-muted-foreground', COLUMNS.lastSignIn)}>
        <LastLogin lastSignInAt={user.last_sign_in_at ?? null} />
      </TableCell>
      <TableCell className="py-1 text-end">
        <UserActionsMenu
          user={user}
          isPending={context.pendingUserId === user.id}
          onAction={(action) => context.onAction(user, action)}
        />
      </TableCell>
    </TableRow>
  )
}

function LastLogin({ lastSignInAt }: { lastSignInAt: string | null }): JSX.Element {
  if (lastSignInAt === null) {
    return <>Nunca</>
  }

  return <Timestamp value={lastSignInAt} format="relative" />
}
