import type { JSX } from 'react'

import { UserIdentityRow } from '@/modules/users/components/user-identity-row'
import { useUserIdentitiesQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Section } from '@/shared/ui/section'

type LinkedIdentity = components['schemas']['LinkedIdentity']

type UserRef = { projectId: string; userId: string }

/**
 * The Google and GitHub accounts the user can log in with, one row each; a user without any gets
 * no section, since "Entra com" already says so.
 */
export function UserIdentitiesSection(ref: UserRef): JSX.Element | null {
  const identities = useUserIdentitiesQuery(ref)
  const list = identities.data?.identities

  if (list !== undefined && list.length === 0) {
    return null
  }

  return (
    <Section title="Login social" meta={list?.length} isFramed>
      <IdentityList identities={list} error={identities.error} />
    </Section>
  )
}

type IdentityListProps = { identities: LinkedIdentity[] | undefined; error: Error | null }

function IdentityList({ identities, error }: IdentityListProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="p-3">
        <ErrorAlert error={error} />
      </div>
    )
  }

  if (identities === undefined) {
    return (
      <div className="flex h-11 items-center gap-2.5 px-4">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-3 w-32" />
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border/70">
      {identities.map((identity) => (
        <UserIdentityRow key={identity.provider} identity={identity} />
      ))}
    </ul>
  )
}
