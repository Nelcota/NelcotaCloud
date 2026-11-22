import type { JSX } from 'react'

import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const UNAVAILABLE = 'API indisponível'

/** Reports API outages with a visible label and an announcement. */
export function ApiStatusDot(): JSX.Element | null {
  const health = useApiHealthQuery()

  if (health.isError === false) {
    return null
  }

  return (
    <span role="status">
      <StatusBadge tone="error" icon={<StatusDot tone="error" label={UNAVAILABLE} />}>
        {UNAVAILABLE}
      </StatusBadge>
    </span>
  )
}
