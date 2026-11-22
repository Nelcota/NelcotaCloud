import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Timestamp } from '@/shared/ui/timestamp'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

/** The OAuth app under the provider's name: its client id and when it was set, or that there is none. */
export function ProviderAppLine({
  configured,
}: {
  configured: ConfiguredProvider | null
}): JSX.Element {
  if (configured === null) {
    return <span className="text-xs text-muted-foreground">Sem app OAuth</span>
  }

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className="sr-only">Client ID </span>
      <code title={configured.client_id} className="min-w-0 truncate font-mono">
        {configured.client_id}
      </code>
      <span aria-hidden>·</span>
      <span className="shrink-0">
        <Timestamp value={configured.updated_at} format="relative" />
      </span>
    </span>
  )
}
