import ArrowLeft from '~icons/solar/arrow-left-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { BreakableEmail } from '@/modules/users/components/breakable-email'
import type { UserActionProps } from '@/modules/users/components/user-action-props'
import { UserHeaderActions } from '@/modules/users/components/user-header-actions'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import { displayNameOf } from '@/modules/users/model/display-name'
import { lastUsersSearch } from '@/modules/users/model/last-users-search'
import { formatDate, formatDateTime, formatRelative } from '@/shared/lib/format-date'
import { usePageTitleOverride } from '@/shared/lib/page-title-override'
import { PageHeader } from '@/shared/ui/page-header'
import { UserAvatar } from '@/shared/ui/user-avatar'

type UserHeaderProps = UserActionProps & { projectId: string }

/**
 * Who the user is and where they stand, in one block: the avatar and email lead, one line of key
 * facts (state, last login, joined) follows, and the actions that change them sit to the right.
 */
export function UserHeader(props: UserHeaderProps): JSX.Element {
  const { projectId, user } = props

  usePageTitleOverride(user.email)

  return (
    <div className="grid gap-4">
      <BackToUsers projectId={projectId} />
      <PageHeader
        leading={
          <UserAvatar
            email={user.email}
            photoUrl={null}
            tone="neutral"
            className="size-12 text-base"
          />
        }
        title={<BreakableEmail email={user.email} />}
        description={<UserKeyFacts {...props} />}
        actions={<UserHeaderActions {...props} />}
      />
    </div>
  )
}

function UserKeyFacts({ user }: UserHeaderProps): JSX.Element {
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      <UserName name={displayNameOf(user.user_metadata)} />
      <UserStatusBadges user={user} />
      <LastSignIn lastSignIn={user.last_sign_in_at} />
      <span className="tabular-nums">Criado em {formatDate(user.created_at)}</span>
    </span>
  )
}

/** The name the user's metadata gives, leading the facts when there is one. */
function UserName({ name }: { name: string | null }): JSX.Element | null {
  if (name === null) {
    return null
  }

  return <span className="text-foreground font-medium">{name}</span>
}

function LastSignIn({ lastSignIn }: { lastSignIn: string | null | undefined }): JSX.Element {
  if (lastSignIn === null || lastSignIn === undefined) {
    return <span>Nunca entrou</span>
  }

  return (
    <time dateTime={lastSignIn} title={formatDateTime(lastSignIn)}>
      Último login {formatRelative(lastSignIn)}
    </time>
  )
}

function BackToUsers({ projectId }: { projectId: string }): JSX.Element {
  return (
    <Link
      to="/projects/$projectId/users"
      params={{ projectId }}
      search={lastUsersSearch(projectId)}
      className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Usuários
    </Link>
  )
}
