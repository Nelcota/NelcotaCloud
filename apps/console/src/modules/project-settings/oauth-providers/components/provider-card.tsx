import type { JSX } from 'react'

import type { OAuthProvider } from '@nelcota/sdk'
import { ConfigureProviderDialog } from '@/modules/project-settings/oauth-providers/components/configure-provider-dialog'
import { ProviderLogo } from '@/shared/ui/provider-logo'
import { PROVIDER_NAMES } from '@/modules/project-settings/oauth-providers/model/provider-names'
import { RemoveProviderButton } from '@/modules/project-settings/oauth-providers/components/remove-provider-button'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Badge } from '@/shared/ui/badge'
import { SettingsSection } from '@/shared/ui/settings-section'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

type ProviderCardProps = {
  projectId: string
  provider: OAuthProvider
  /** `null` when the project has no OAuth app for this provider. */
  configured: ConfiguredProvider | null
}

/** Whether login with one provider is on, with which app, and how to change or turn it off. */
export function ProviderCard({ projectId, provider, configured }: ProviderCardProps): JSX.Element {
  const providerName = PROVIDER_NAMES[provider]

  return (
    <SettingsSection
      title={providerName}
      leading={<ProviderLogo provider={provider} />}
      description={`Use o OAuth app do seu próprio ${providerName}.`}
    >
      <ProviderStatus configured={configured} />
      <ProviderActions projectId={projectId} provider={provider} configured={configured} />
    </SettingsSection>
  )
}

function ProviderStatus({ configured }: { configured: ConfiguredProvider | null }): JSX.Element {
  if (configured === null) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="muted">Desativado</Badge>
        <span className="text-muted-foreground">Ninguém entra com este provedor ainda.</span>
      </div>
    )
  }

  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Ativo</Badge>
        <span className="text-muted-foreground">desde {formatDateTime(configured.updated_at)}</span>
      </div>
      <div className="flex min-w-0 gap-2">
        <dt className="text-muted-foreground shrink-0">Client ID</dt>
        <dd className="min-w-0 font-mono text-xs leading-5 break-all">{configured.client_id}</dd>
      </div>
    </dl>
  )
}

function ProviderActions({ projectId, provider, configured }: ProviderCardProps): JSX.Element {
  if (configured === null) {
    return (
      <div>
        <ConfigureProviderDialog
          projectId={projectId}
          provider={provider}
          triggerLabel="Configurar"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ConfigureProviderDialog
        projectId={projectId}
        provider={provider}
        triggerLabel="Trocar credenciais"
      />
      <RemoveProviderButton projectId={projectId} provider={provider} />
    </div>
  )
}
