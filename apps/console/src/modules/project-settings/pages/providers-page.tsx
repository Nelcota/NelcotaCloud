import type { JSX } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderCard } from '@/modules/project-settings/components/provider-card'
import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

const CALLBACK_PATH = '/auth/v1/oauth/callback'
const PROVIDERS: readonly OAuthProviderName[] = ['google', 'github']

export function ProvidersPage(): JSX.Element {
  const projectId = useProjectId()
  const providers = useOAuthProvidersQuery(projectId)

  return (
    <div className="grid max-w-5xl gap-6">
      <PageHeader
        title="Login social"
        description="Deixe seus usuários entrarem com Google ou GitHub, usando os OAuth apps da sua conta."
      />
      <SettingsSection
        title="URL de callback"
        description="Cadastre este endereço como URL de redirecionamento no OAuth app do Google e do GitHub. Ele aponta para a API deste ambiente."
      >
        <SecretReveal label="URL de callback" value={`${API_BASE_URL}${CALLBACK_PATH}`} />
      </SettingsSection>
      <ErrorAlert error={providers.error} />
      <ProviderCards projectId={projectId} configured={providers.data} />
    </div>
  )
}

type ProviderCardsProps = {
  projectId: string
  /** `undefined` while loading. */
  configured: ConfiguredProvider[] | undefined
}

function ProviderCards({ projectId, configured }: ProviderCardsProps): JSX.Element {
  if (configured === undefined) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando provedores"
        className="grid gap-6 lg:grid-cols-2"
      >
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {PROVIDERS.map((provider) => (
        <ProviderCard
          key={provider}
          projectId={projectId}
          provider={provider}
          configured={configured.find((entry) => entry.provider === provider) ?? null}
        />
      ))}
    </div>
  )
}
