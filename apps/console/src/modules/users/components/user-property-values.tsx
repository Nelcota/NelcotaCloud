import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Timestamp } from '@/shared/ui/timestamp'

type User = components['schemas']['User']

type OptionalDateProps = { value: string | null | undefined; missing: string }

/** A date with the exact time on hover, or a quiet word when the account has none. */
export function OptionalDate({ value, missing }: OptionalDateProps): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">{missing}</span>
  }

  return <Timestamp value={value} />
}

/** The email with when it was confirmed, or that it is not yet. */
export function UserEmailFact({ user }: { user: User }): JSX.Element {
  const verifiedAt = user.email_verified_at

  if (verifiedAt === null || verifiedAt === undefined) {
    return (
      <>
        {user.email}
        <span className="text-warning"> · não confirmado</span>
      </>
    )
  }

  return (
    <>
      {user.email}
      <span className="text-muted-foreground">
        {' · confirmado em '}
        <Timestamp value={verifiedAt} />
      </span>
    </>
  )
}
