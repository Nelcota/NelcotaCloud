import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderRow } from '@/modules/project-settings/components/provider-row'
import type { components } from '@/shared/api/api-schema'
import { Section } from '@/shared/ui/section'

type ConfiguredProviders = components['schemas']['ConfiguredProviders']

const PROVIDERS: readonly OAuthProviderName[] = ['google', 'github']

type ProvidersTableProps = { projectId: string; configured: ConfiguredProviders }

/** Every supported provider, on or off, as one dense row each. */
export function ProvidersTable({ projectId, configured }: ProvidersTableProps): JSX.Element {
  const activeCount = configured.providers.length

  return (
    <Section title="Provedores" meta={`${activeCount} de ${PROVIDERS.length} ativos`} isFramed>
      <ul className="divide-y divide-border/60">
        {PROVIDERS.map((provider) => (
          <ProviderRow
            key={provider}
            projectId={projectId}
            provider={provider}
            callbackUrl={configured.callback_url}
            configured={configured.providers.find((entry) => entry.provider === provider) ?? null}
          />
        ))}
      </ul>
    </Section>
  )
}
