import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'

type User = components['schemas']['User']

/** The account's state at a glance: blocked wins over everything, then email and MFA. */
export function UserStatusBadges({ user }: { user: User }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1">
      <AccountBadge user={user} />
      <MfaBadge isEnabled={user.mfa_enabled} />
    </div>
  )
}

function AccountBadge({ user }: { user: User }): JSX.Element {
  if (user.banned_at !== null && user.banned_at !== undefined) {
    return <Badge variant="destructive">Bloqueado</Badge>
  }

  if (user.email_verified_at === null || user.email_verified_at === undefined) {
    return <Badge variant="warning">Email não confirmado</Badge>
  }

  return <Badge variant="success">Ativo</Badge>
}

function MfaBadge({ isEnabled }: { isEnabled: boolean }): JSX.Element | null {
  if (isEnabled === false) {
    return null
  }

  return <Badge>MFA</Badge>
}
