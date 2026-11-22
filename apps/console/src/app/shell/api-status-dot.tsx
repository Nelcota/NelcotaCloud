import type { JSX } from 'react'

import { useApiHealthQuery } from '@/modules/system-status/queries/use-api-health-query'
import { StatusBadge } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const UNAVAILABLE = 'API indisponível'

/** Reports API outages with a visible label and an announcement. */
export function ApiStatusDot(): JSX.Element {
  const health = useApiHealthQuery()

  /* The live region exists before the outage so screen readers announce the badge appearing. */
  return (
    <span role="status">
      <OutageBadge isDown={health.isError} />
    </span>
  )
}

function OutageBadge({ isDown }: { isDown: boolean }): JSX.Element | null {
  if (isDown === false) {
    return null
  }

  return (
    <StatusBadge tone="error" icon={<StatusDot tone="error" label={UNAVAILABLE} />}>
      {UNAVAILABLE}
    </StatusBadge>
  )
}
