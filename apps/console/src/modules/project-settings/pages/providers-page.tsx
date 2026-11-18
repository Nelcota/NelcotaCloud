import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderCard } from '@/modules/project-settings/components/provider-card'
import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

const PROVIDERS: readonly OAuthProviderName[] = ['google', 'github']

export function ProvidersPage(): JSX.Element {
  const projectId = useProjectId()
  const providers = useOAuthProvidersQuery(projectId)

  return (
    <div className="grid max-w-5xl gap-6">
      <PageHeader
        title="Login social"
        description="Deixe seus usuários entrarem com Google ou GitHub, usando os OAuth apps da sua conta. A URL de callback aparece ao configurar cada um."
      />
      <LoadError error={providers.error} onRetry={() => providers.refetch()} />
      <ProviderCards
        projectId={projectId}
        configured={providers.data}
        hasFailed={providers.isError}
      />
    </div>
  )
}

type ProviderCardsProps = {
  projectId: string
  /** `undefined` while loading. */
  configured: ConfiguredProvider[] | undefined
  hasFailed: boolean
}

function ProviderCards({
  projectId,
  configured,
  hasFailed,
}: ProviderCardsProps): JSX.Element | null {
  if (configured === undefined && hasFailed) {
    return null
  }

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
