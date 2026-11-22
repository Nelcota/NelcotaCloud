import type { JSX } from 'react'

import { useOAuthProvidersQuery } from '@/modules/project-settings/queries/use-oauth-providers'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'

const PROVIDER_COUNT_LABELS: Record<number, string> = { 1: '1 provedor', 2: '2 provedores' }

/** How many providers have the project's own OAuth app; nothing when it cannot be read. */
export function SocialMethodStatus({ projectId }: { projectId: string }): JSX.Element | null {
  const providers = useOAuthProvidersQuery(projectId)

  if (providers.isPending) {
    return <Skeleton className="h-5 w-20" />
  }

  if (providers.data === undefined) {
    return null
  }

  const count = providers.data.length

  if (count === 0) {
    return <StatusBadge>Desativado</StatusBadge>
  }

  return (
    <StatusBadge tone="success">
      {PROVIDER_COUNT_LABELS[count] ?? `${count} provedores`}
    </StatusBadge>
  )
}
