import type { JSX } from 'react'

import { ProviderLogo } from '@/modules/project-settings/components/provider-logo'
import type { components } from '@/shared/api/api-schema'
import { Timestamp } from '@/shared/ui/timestamp'

type LinkedIdentity = components['schemas']['LinkedIdentity']

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

/** One linked provider and when it was linked. */
export function UserIdentityRow({ identity }: { identity: LinkedIdentity }): JSX.Element {
  const provider = identity.provider

  return (
    <li className="flex flex-wrap items-center gap-2">
      <IdentityLogo provider={provider} />
      <span className="font-medium">{PROVIDER_NAMES[provider] ?? provider}</span>
      <span className="text-xs text-muted-foreground">
        vinculado em <Timestamp value={identity.linked_at} />
      </span>
    </li>
  )
}

/** Only the providers the console knows have a logo; any other is shown by name alone. */
function IdentityLogo({ provider }: { provider: string }): JSX.Element | null {
  if (provider === 'google' || provider === 'github') {
    return <ProviderLogo provider={provider} />
  }

  return null
}
