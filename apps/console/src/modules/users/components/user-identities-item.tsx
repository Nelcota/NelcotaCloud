import type { JSX } from 'react'

import { UserIdentityRow } from '@/modules/users/components/user-identity-row'
import { useUserIdentitiesQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { DataListItem } from '@/shared/ui/data-list'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type LinkedIdentity = components['schemas']['LinkedIdentity']

type UserRef = { projectId: string; userId: string }

/**
 * The Google and GitHub accounts the user can log in with, as one row of the account facts; a
 * user without any gets no row, since "Entra com" already says so.
 */
export function UserIdentitiesItem(ref: UserRef): JSX.Element | null {
  const identities = useUserIdentitiesQuery(ref)
  const list = identities.data?.identities

  if (list !== undefined && list.length === 0) {
    return null
  }

  return (
    <DataListItem label="Login social">
      <IdentityList identities={list} error={identities.error} />
    </DataListItem>
  )
}

type IdentityListProps = { identities: LinkedIdentity[] | undefined; error: Error | null }

function IdentityList({ identities, error }: IdentityListProps): JSX.Element {
  if (error !== null) {
    return <ErrorAlert error={error} />
  }

  if (identities === undefined) {
    return <Skeleton className="h-5 w-40" />
  }

  return (
    <ul className="grid gap-1.5">
      {identities.map((identity) => (
        <UserIdentityRow key={identity.provider} identity={identity} />
      ))}
    </ul>
  )
}
