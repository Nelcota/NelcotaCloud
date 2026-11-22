import type { JSX } from 'react'

import { MetricValue } from '@/modules/overview/components/metric-card'
import type { components } from '@/shared/api/api-schema'
import { StatCard } from '@/shared/ui/stat-card'

type RefusedLoginsCardProps = {
  summary: components['schemas']['AuditSummary'] | undefined
  days: number
}

/** Wrong email or password in the period, with the address most of them came from. */
export function RefusedLoginsCard({ summary, days }: RefusedLoginsCardProps): JSX.Element {
  return (
    <StatCard
      label="Logins recusados"
      value={<MetricValue value={summary?.failures} />}
      hint={<TopAddress summary={summary} days={days} />}
    />
  )
}

function TopAddress({ summary, days }: RefusedLoginsCardProps): JSX.Element {
  const top = summary?.failing_addresses[0]

  if (top === undefined) {
    return <>em {days} dias</>
  }

  return (
    <>
      mais de <code className="font-mono text-foreground">{top.ip_address}</code> ({top.failures})
    </>
  )
}
