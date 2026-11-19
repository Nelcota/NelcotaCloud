import type { JSX } from 'react'

import { ProviderLogo } from '@/modules/project-settings/components/provider-logo'
import { useUserIdentitiesQuery } from '@/modules/users/queries/use-user-detail'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

type LinkedIdentity = components['schemas']['LinkedIdentity']

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

type UserRef = { projectId: string; userId: string }

/** The Google and GitHub accounts the user can log in with. */
export function UserIdentitiesSection(ref: UserRef): JSX.Element {
  const identities = useUserIdentitiesQuery(ref)

  return (
    <SettingsSection title="Login social">
      <ErrorAlert error={identities.error} />
      <IdentityList identities={identities.data?.identities} hasFailed={identities.isError} />
    </SettingsSection>
  )
}

type IdentityListProps = { identities: LinkedIdentity[] | undefined; hasFailed: boolean }

function IdentityList({ identities, hasFailed }: IdentityListProps): JSX.Element | null {
  if (hasFailed) {
    return null
  }

  if (identities === undefined) {
    return <Skeleton className="h-12 rounded-lg" />
  }

  if (identities.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum login social vinculado.</p>
  }

  return (
    <ul className="divide-y rounded-lg border">
      {identities.map((identity) => (
        <li key={identity.provider} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <IdentityLogo provider={identity.provider} />
          <span className="font-medium">{providerName(identity.provider)}</span>
          <span className="text-muted-foreground sm:ml-auto">
            Vinculado em {formatDateTime(identity.linked_at)}
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
