import Login from '~icons/solar/login-3-linear'
import PenNewSquare from '~icons/solar/pen-new-square-linear'
import ShieldCross from '~icons/solar/shield-cross-linear'
import UserCheck from '~icons/solar/user-check-linear'
import type { JSX } from 'react'

import { SuspicionStatus } from '@/modules/activity/components/suspicion-status'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { MetricCardBody, type MetricCardBodyProps } from '@/shared/ui/metric-card'
import { METRIC_CARD_ACTION_CLASS, METRIC_CARD_CLASS } from '@/shared/ui/metric-card-styles'

type AuditSummary = components['schemas']['AuditSummary']

const COUNT = new Intl.NumberFormat('pt-BR')

export type ActivityMetricsProps = {
  /** `undefined` while loading; each card then shows a placeholder. */
  summary: AuditSummary | undefined
  error: Error | null
  onRetry: () => void
  suspiciousCount: number
  /** Narrows the log to refused logins; the card is the way in, not a second filter control. */
  onShowFailures: () => void
}

/** The period's figures in the same card grid as the overview, so they scan the same way. */
export function ActivityMetrics(props: ActivityMetricsProps): JSX.Element {
  const { summary, error, onRetry } = props
  const state = { error, onRetry, detail: null }

  return (
    <section aria-labelledby="activity-metrics-title" className="@container">
      <h2 id="activity-metrics-title" className="sr-only">
        Resumo do período
      </h2>
      <div className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
        <MetricCard {...state} icon={Login} label="Logins" value={countOf(summary?.logins)} />
        <MetricCard
          {...state}
          icon={UserCheck}
          label="Contas que entraram"
          value={countOf(summary?.active_users)}
        />
        <FailuresCard {...props} />
        <MetricCard
          {...state}
          icon={PenNewSquare}
          label="Alterações"
          value={countOf(summary?.changes)}
        />
      </div>
    </section>
  )
}

function MetricCard(props: MetricCardBodyProps): JSX.Element {
  return (
    <div className={METRIC_CARD_CLASS}>
      <MetricCardBody {...props} />
    </div>
  )
}

/** Opens the refused logins when there are any; its line answers whether an IP looks suspicious. */
function FailuresCard(props: ActivityMetricsProps): JSX.Element {
  const failures = props.summary?.failures
  const body: MetricCardBodyProps = {
    icon: ShieldCross,
    label: 'Logins recusados',
    value: countOf(failures),
    error: props.error,
    onRetry: props.onRetry,
    detail: suspicionDetail(props),
  }

  if (failures === undefined || failures === 0 || props.error !== null) {
    return <MetricCard {...body} />
  }

  return (
    <button
      type="button"
      onClick={props.onShowFailures}
      className={cn(METRIC_CARD_CLASS, METRIC_CARD_ACTION_CLASS)}
    >
      <MetricCardBody {...body} hasArrow />
    </button>
  )
}

function suspicionDetail(props: ActivityMetricsProps): JSX.Element | null {
  if (props.summary === undefined) {
    return null
  }

  return <SuspicionStatus count={props.suspiciousCount} />
}

function countOf(value: number | undefined): string | null {
  if (value === undefined) {
    return null
  }

  return COUNT.format(value)
}
