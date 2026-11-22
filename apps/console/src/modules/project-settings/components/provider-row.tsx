import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderActions } from '@/modules/project-settings/components/provider-actions'
import { ProviderLogo } from '@/modules/project-settings/components/provider-logo'
import { PROVIDER_NAMES } from '@/modules/project-settings/components/provider-names'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

type ProviderRowProps = {
  projectId: string
  provider: OAuthProviderName
  callbackUrl: string
  /** `null` when the project has no OAuth app for this provider. */
  configured: ConfiguredProvider | null
}

/** An OAuth provider as one table row: state, the app it uses, its callback and actions. */
export function ProviderRow(props: ProviderRowProps): JSX.Element {
  const { provider, configured, callbackUrl } = props
  const providerName = PROVIDER_NAMES[provider]

  return (
    <TableRow>
      <TableCell className="py-3.5">
        <span className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-surface">
            <ProviderLogo provider={provider} size="md" />
          </span>
          <span className="font-medium text-heading">{providerName}</span>
        </span>
      </TableCell>
      <TableCell>
        <ProviderStatus configured={configured} />
      </TableCell>
      <TableCell className="max-w-56">
        <ClientId configured={configured} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <ConfiguredAt configured={configured} />
      </TableCell>
      <TableCell className="max-w-64">
        <IdChip label={`URL de callback: ${providerName}`} value={callbackUrl} />
      </TableCell>
      <TableCell className="text-end">
        <span className="flex items-center justify-end gap-1">
          <ProviderActions
            projectId={props.projectId}
            provider={provider}
            callbackUrl={callbackUrl}
            configured={configured}
          />
        </span>
      </TableCell>
    </TableRow>
  )
}

type ConfiguredProps = { configured: ConfiguredProvider | null }

function ProviderStatus({ configured }: ConfiguredProps): JSX.Element {
  if (configured === null) {
    return <StatusBadge>Desligado</StatusBadge>
  }

  return <StatusBadge tone="success">Ativo</StatusBadge>
}

function ClientId({ configured }: ConfiguredProps): JSX.Element {
  if (configured === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <code title={configured.client_id} className="block truncate font-mono text-xs">
      {configured.client_id}
    </code>
  )
}

function ConfiguredAt({ configured }: ConfiguredProps): JSX.Element {
  if (configured === null) {
    return <span>—</span>
  }

  return <Timestamp value={configured.updated_at} format="relative" />
}
