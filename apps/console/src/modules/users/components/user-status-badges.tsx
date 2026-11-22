import type { JSX } from 'react'

import { isBanned, isVerified } from '@/modules/users/components/user-states'
import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type User = components['schemas']['User']

type UserStatusBadgesProps = {
  user: User
  /** The user's page also marks a confirmed email; the list only marks what needs a hand. */
  showsConfirmed?: boolean
}

/** The account's state at a glance: blocked wins over everything, then email and MFA. */
export function UserStatusBadges({ user, showsConfirmed }: UserStatusBadgesProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AccountBadge user={user} showsConfirmed={showsConfirmed === true} />
      <MfaBadge isEnabled={user.mfa_enabled} />
    </div>
  )
}

function AccountBadge({
  user,
  showsConfirmed,
}: {
  user: User
  showsConfirmed: boolean
}): JSX.Element | null {
  if (isBanned(user)) {
    return <StatusBadge tone="error">Bloqueado</StatusBadge>
  }

  if (isVerified(user) === false) {
    return <StatusBadge tone="warning">Não confirmado</StatusBadge>
  }

  if (showsConfirmed === false) {
    return null
  }

  return <StatusBadge tone="success">Confirmado</StatusBadge>
}

function MfaBadge({ isEnabled }: { isEnabled: boolean }): JSX.Element | null {
  if (isEnabled === false) {
    return null
  }

  return <StatusBadge tone="info">MFA</StatusBadge>
}
