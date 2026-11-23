import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderActions } from '@/modules/project-settings/components/provider-actions'
import { ProviderAppLine } from '@/modules/project-settings/components/provider-app-line'
import { ProviderLogo } from '@/modules/project-settings/components/provider-logo'
import { PROVIDER_NAMES } from '@/modules/project-settings/components/provider-names'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { StatusBadge } from '@/shared/ui/status-badge'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

type ProviderRowProps = {
  projectId: string
  provider: OAuthProviderName
  callbackUrl: string
  /** `null` when the project has no OAuth app for this provider. */
  configured: ConfiguredProvider | null
}

/** An OAuth provider as one row: its mark and app, state, callback URL and actions. */
export function ProviderRow(props: ProviderRowProps): JSX.Element {
  const { provider, configured, callbackUrl } = props
  const providerName = PROVIDER_NAMES[provider]

  return (
    <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3 transition-colors hover:bg-surface md:grid-cols-[minmax(0,14rem)_5.5rem_minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface">
          <ProviderLogo provider={provider} />
        </span>
        <div className="grid min-w-0">
          <span className="truncate text-sm font-medium">{providerName}</span>
          <ProviderAppLine configured={configured} />
        </div>
      </div>
      <div className="justify-self-end md:justify-self-start">
        <ProviderStatus configured={configured} />
      </div>
      <IdChip
        label="URL de callback"
        value={callbackUrl}
        isLabelVisible
        className="col-span-2 w-full md:col-span-1"
      />
      <div className="col-span-2 flex items-center justify-end gap-1 md:col-span-1">
        <ProviderActions
          projectId={props.projectId}
          provider={provider}
          callbackUrl={callbackUrl}
          configured={configured}
        />
      </div>
    </li>
  )
}

function ProviderStatus({ configured }: { configured: ConfiguredProvider | null }): JSX.Element {
  if (configured === null) {
    return <StatusBadge>Desativado</StatusBadge>
  }

  return <StatusBadge tone="success">Ativo</StatusBadge>
}
