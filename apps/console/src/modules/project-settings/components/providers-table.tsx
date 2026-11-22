import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderRow } from '@/modules/project-settings/components/provider-row'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'
import { Section } from '@/shared/ui/section'

type ConfiguredProviders = components['schemas']['ConfiguredProviders']

const PROVIDERS: readonly OAuthProviderName[] = ['google', 'github']

type ProvidersTableProps = { projectId: string; configured: ConfiguredProviders }

/** Every supported provider, on or off, with the OAuth app the project uses for it. */
export function ProvidersTable({ projectId, configured }: ProvidersTableProps): JSX.Element {
  const activeCount = configured.providers.length

  return (
    <Section title="Provedores" meta={`${activeCount} de ${PROVIDERS.length} ativos`} isFramed>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provedor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead>Configurado</TableHead>
            <TableHead>Callback URL</TableHead>
            <TableHead className="w-0 text-end">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PROVIDERS.map((provider) => (
            <ProviderRow
              key={provider}
              projectId={projectId}
              provider={provider}
              callbackUrl={configured.callback_url}
              configured={configured.providers.find((entry) => entry.provider === provider) ?? null}
            />
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}
