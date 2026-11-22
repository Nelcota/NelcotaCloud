import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** An unnamed key is called by its kind. */
const KIND_TITLES: Record<string, string> = {
  publishable: 'Chave publicável',
  secret: 'Chave secreta',
}

export function KeyName({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  const name = apiKey.name.trim()

  if (name === '') {
    return <span className="text-muted-foreground">{KIND_TITLES[apiKey.kind] ?? apiKey.kind}</span>
  }

  return (
    <span className="block truncate font-medium text-heading" title={name}>
      {name}
    </span>
  )
}
