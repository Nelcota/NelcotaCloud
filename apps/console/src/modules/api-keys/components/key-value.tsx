import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const KEY_PREFIXES: Record<string, string> = {
  publishable: 'nc_pk_',
  secret: 'nc_sk_',
}
/** Enough of a publishable key to recognize it at a glance; the copy button gives all of it. */
const VISIBLE_START = 14
const MASK = '••••'

type KeyValueProps = { apiKey: ApiKeySummary; className?: string }

/**
 * The key as the list shows it: a publishable key's start and end; a secret key masked down to
 * its last characters, since the API never returns it again.
 */
export function KeyValue({ apiKey, className }: KeyValueProps): JSX.Element {
  return <code className={cn('truncate font-mono', className)}>{displayedKey(apiKey)}</code>
}

function displayedKey(apiKey: ApiKeySummary): string {
  const fullKey = apiKey.key ?? null

  if (fullKey === null) {
    return `${KEY_PREFIXES[apiKey.kind] ?? ''}${MASK}${apiKey.hint}`
  }

  return `${fullKey.slice(0, VISIBLE_START)}…${apiKey.hint}`
}
