import KeyRound from '~icons/solar/key-linear'
import type { JSX } from 'react'

import { activeKeys } from '@/modules/api-keys/components/key-activity'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { OverviewCard } from '@/modules/overview/components/overview-card'
import { countOrNull } from '@/modules/overview/components/overview-metrics'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export function KeysCard({ projectId }: { projectId: string }): JSX.Element {
  const keys = useApiKeysQuery(projectId)
  const active = activeOf(keys.data)

  return (
    <OverviewCard
      icon={KeyRound}
      title="Chaves de API"
      metricLabel="Ativas"
      value={countOrNull(active?.length)}
      error={keys.error}
      onRetry={() => keys.refetch()}
      detail={keysDetail(active)}
      links={[{ label: 'Chaves', to: `/projects/${projectId}/keys` }]}
    />
  )
}

/** `undefined` until the keys arrive, so the card shows a placeholder rather than a false zero. */
function activeOf(keys: ApiKeySummary[] | undefined): ApiKeySummary[] | undefined {
  if (keys === undefined) {
    return undefined
  }

  return activeKeys(keys)
}

function keysDetail(active: ApiKeySummary[] | undefined): string | null {
  if (active === undefined) {
    return null
  }

  const publishable = active.filter((key) => key.kind === 'publishable').length

  return `${publishable} publishable · ${active.length - publishable} secret`
}
