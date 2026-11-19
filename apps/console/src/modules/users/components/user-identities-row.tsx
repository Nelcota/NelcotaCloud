import type { JSX } from 'react'

import { DetailRow } from '@/modules/users/components/detail-row'
import { useUserIdentitiesQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { ProviderLogo } from '@/shared/ui/provider-logo'
import { Skeleton } from '@/shared/ui/skeleton'

type LinkedIdentity = components['schemas']['LinkedIdentity']

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

type UserRef = { projectId: string; userId: string }

/** The Google and GitHub accounts the user can log in with, as one fact of the account. */
export function UserIdentitiesRow(ref: UserRef): JSX.Element {
  const identities = useUserIdentitiesQuery(ref)

  return (
    <DetailRow label="Login social">
      <ErrorAlert error={identities.error} />
      <IdentityList identities={identities.data?.identities} hasFailed={identities.isError} />
    </DetailRow>
  )
}

type IdentityListProps = { identities: LinkedIdentity[] | undefined; hasFailed: boolean }

function IdentityList({ identities, hasFailed }: IdentityListProps): JSX.Element | null {
  if (hasFailed) {
    return null
  }

  if (identities === undefined) {
    return <Skeleton className="mt-1 h-4 w-40" />
  }

  if (identities.length === 0) {
    return <span className="text-muted-foreground font-normal">Nenhum</span>
  }

  return (
    <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
      {identities.map((identity) => (
        <li key={identity.provider} className="flex items-center gap-2">
          <IdentityLogo provider={identity.provider} />
          {providerName(identity.provider)}
          <span className="text-muted-foreground font-normal">
            desde {formatDate(identity.linked_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Only the providers the console knows have a logo; any other is shown by name alone. */
function IdentityLogo({ provider }: { provider: string }): JSX.Element | null {
  if (provider === 'google' || provider === 'github') {
    return <ProviderLogo provider={provider} />
  }

  return null
}

function providerName(provider: string): string {
  return PROVIDER_NAMES[provider] ?? provider
}
