import type { JSX } from 'react'

import { visibleKey } from '@/modules/api-keys/components/key-activity'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type KeyValueProps = { apiKey: ApiKeySummary; isRevoked: boolean }

/** A publishable key in full, to copy; any other key only by its last characters. */
export function KeyValue({ apiKey, isRevoked }: KeyValueProps): JSX.Element {
  const value = visibleKey(apiKey, isRevoked)

  if (value !== null) {
    return (
      <IdChip label={`Chave publicável …${apiKey.hint}`} value={value} className="max-w-full" />
    )
  }

  return <KeyHint hint={apiKey.hint} />
}

function KeyHint({ hint }: { hint: string }): JSX.Element {
  if (hint === '') {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <code className="font-mono text-sm text-muted-foreground">
      <span className="sr-only">termina em </span>…{hint}
    </code>
  )
}
