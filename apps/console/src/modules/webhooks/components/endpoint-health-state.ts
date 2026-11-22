import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import type { NoticeTone } from '@/shared/ui/notice'
import type { StatusTone } from '@/shared/ui/status-badge'

export type HealthAction = 'show_failed' | 'show_pending'

export type HealthKind = 'auto_paused' | 'paused' | 'failing' | 'retrying' | 'idle' | 'delivering'

export type EndpointHealthState = {
  /** The summary sentence's tone. */
  tone: NoticeTone
  /** The header pill's tone. */
  badgeTone: StatusTone
  /** The verdict word that opens the summary sentence. */
  verdict: string
  /** The header pill's text. */
  label: string
  /** The step only this strip offers; testing and pausing live in the page header. */
  action: { kind: HealthAction; label: string } | null
}

/** How each health reads, and the action that fits it. */
export const HEALTH: Record<HealthKind, EndpointHealthState> = {
  auto_paused: {
    tone: 'error',
    badgeTone: 'error',
    verdict: 'Pausado por falhas.',
    label: 'Pausado por falhas',
    action: null,
  },
  paused: {
    tone: 'info',
    badgeTone: 'neutral',
    verdict: 'Pausado.',
    label: 'Pausado',
    action: null,
  },
  failing: {
    tone: 'error',
    badgeTone: 'error',
    verdict: 'Falhando.',
    label: 'Falhando',
    action: { kind: 'show_failed', label: 'Ver falhas' },
  },
  retrying: {
    tone: 'warning',
    badgeTone: 'warning',
    verdict: 'Tentando de novo.',
    label: 'Tentando de novo',
    action: { kind: 'show_pending', label: 'Ver pendentes' },
  },
  idle: {
    tone: 'info',
    badgeTone: 'neutral',
    verdict: 'Sem entregas.',
    label: 'Sem entregas',
    action: null,
  },
  delivering: {
    tone: 'success',
    badgeTone: 'success',
    verdict: 'Entregando.',
    label: 'Saudável',
    action: null,
  },
}

type EndpointSwitch = Pick<WebhookEndpoint, 'is_enabled' | 'auto_paused_at'>

/** Whether the endpoint works: paused first, then recent failures, retries, silence or fine. */
export function healthKindOf(endpoint: EndpointSwitch, summary: DeliverySummary): HealthKind {
  if (endpoint.is_enabled === false) {
    return pauseKindOf(endpoint.auto_paused_at ?? null)
  }

  if (summary.failedLastDay > 0) {
    return 'failing'
  }

  if (summary.pending > 0) {
    return 'retrying'
  }

  if (summary.newest === null) {
    return 'idle'
  }

  return 'delivering'
}

/** Paused by its owner, or by the platform after failing for days. */
function pauseKindOf(autoPausedAt: string | null): HealthKind {
  if (autoPausedAt === null) {
    return 'paused'
  }

  return 'auto_paused'
}
