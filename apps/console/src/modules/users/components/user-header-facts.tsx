import type { JSX } from 'react'

import { UserShortId } from '@/modules/users/components/user-short-id'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import type { components } from '@/shared/api/api-schema'
import { Timestamp } from '@/shared/ui/timestamp'

type User = components['schemas']['User']

/** The line under the email: the short id as a mono pill, the states and the last login. */
export function UserHeaderFacts({ user }: { user: User }): JSX.Element {
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      <UserShortId id={user.id} className="h-6 rounded-md bg-surface ps-2 pe-0.5" />
      <UserStatusBadges user={user} showsConfirmed />
      <LastLogin value={user.last_sign_in_at ?? null} />
    </div>
  )
}

function LastLogin({ value }: { value: string | null }): JSX.Element {
  if (value === null) {
    return <span>Nunca entrou</span>
  }

  return (
    <span>
      Último login <Timestamp value={value} format="relative" />
    </span>
  )
}
