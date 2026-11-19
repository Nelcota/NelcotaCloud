import type { JSX } from 'react'

import { ConnectAppPanel } from '@/modules/api-keys/components/connect-app-panel'
import { activeKeys } from '@/modules/api-keys/components/key-activity'
import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { useUserCountQuery } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/**
 * The connect steps, filled with the project's newest publishable key the API can show. Only
 * until the first user signs up: after that the app is connected and the Keys page covers it.
 */
export function ProjectConnectPanel({ projectId }: { projectId: string }): JSX.Element | null {
  const userCount = useUserCountQuery(projectId)

  if (userCount.data !== 0) {
    return null
  }

  return <ConnectWithKey projectId={projectId} />
}

function ConnectWithKey({ projectId }: { projectId: string }): JSX.Element {
  const keys = useApiKeysQuery(projectId)

  return <ConnectAppPanel publishableKey={visiblePublishable(keys.data)} projectId={projectId} />
}

function visiblePublishable(keys: ApiKeySummary[] | undefined): string | null {
  if (keys === undefined) {
    return null
  }

  const visible = activeKeys(keys).find(
    (key) => key.kind === 'publishable' && typeof key.key === 'string',
  )

  return visible?.key ?? null
}
