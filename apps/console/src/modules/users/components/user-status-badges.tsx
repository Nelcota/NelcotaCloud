import type { JSX } from 'react'

import {
  ACCOUNT_STATE_LABELS,
  type AccountState,
  accountStateOf,
} from '@/modules/users/model/account-state'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { Badge } from '@/shared/ui/badge'

type User = components['schemas']['User']

/** One dot colour per state: calm for a working account, amber and red for those needing a hand. */
const DOT_COLORS: Record<AccountState, string> = {
  active: 'bg-emerald-500',
  unverified: 'bg-amber-500',
  banned: 'bg-destructive',
}

const TEXT_COLORS: Record<AccountState, string> = {
  active: 'text-muted-foreground',
  unverified: 'text-amber-700 dark:text-amber-400',
  banned: 'text-destructive',
}

/**
 * The account's state as a dot and a word, the same in the list and on the user's page, so a
 * column of states scans as colour first; MFA follows as a neutral tag when it is on.
 */
export function UserStatusBadges({ user }: { user: User }): JSX.Element {
  const state = accountStateOf(user)

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn('inline-flex items-center gap-1.5', TEXT_COLORS[state])}>
        <span
          aria-hidden="true"
          className={cn('size-1.5 shrink-0 rounded-full', DOT_COLORS[state])}
        />
        {ACCOUNT_STATE_LABELS[state]}
      </span>
      <MfaBadge isEnabled={user.mfa_enabled} />
    </span>
  )
}

function MfaBadge({ isEnabled }: { isEnabled: boolean }): JSX.Element | null {
  if (isEnabled === false) {
    return null
  }

  return <Badge>MFA</Badge>
}
