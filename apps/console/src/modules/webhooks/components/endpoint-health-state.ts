import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import type { NoticeTone } from '@/shared/ui/notice'
import type { StatusTone } from '@/shared/ui/status-badge'

export type HealthAction = 'resume' | 'test' | 'show_failed' | 'show_pending'

export type HealthKind = 'paused' | 'failing' | 'retrying' | 'idle' | 'delivering'

export type EndpointHealthState = {
  /** The summary sentence's tone. */
  tone: NoticeTone
  /** The header pill's tone. */
  badgeTone: StatusTone
  /** The verdict word that opens the summary sentence. */
  verdict: string
  /** The header pill's text. */
  label: string
  action: HealthAction
  actionLabel: string
}

/** How each health reads, and the action that fits it. */
export const HEALTH: Record<HealthKind, EndpointHealthState> = {
  paused: {
    tone: 'info',
    badgeTone: 'neutral',
    verdict: 'Pausado.',
    label: 'Pausado',
    action: 'resume',
    actionLabel: 'Retomar',
  },
  failing: {
    tone: 'error',
    badgeTone: 'error',
    verdict: 'Falhando.',
    label: 'Falhando',
    action: 'show_failed',
    actionLabel: 'Ver falhas',
  },
  retrying: {
    tone: 'warning',
    badgeTone: 'warning',
    verdict: 'Tentando de novo.',
    label: 'Tentando de novo',
    action: 'show_pending',
    actionLabel: 'Ver pendentes',
  },
  idle: {
    tone: 'info',
    badgeTone: 'neutral',
    verdict: 'Sem entregas.',
    label: 'Sem entregas',
    action: 'test',
    actionLabel: 'Enviar evento de teste',
  },
  delivering: {
    tone: 'success',
    badgeTone: 'success',
    verdict: 'Entregando.',
    label: 'Saudável',
    action: 'test',
    actionLabel: 'Enviar evento de teste',
  },
}

/** Whether the endpoint works: paused first, then recent failures, retries, silence or fine. */
export function healthKindOf(isEnabled: boolean, summary: DeliverySummary): HealthKind {
  if (isEnabled === false) {
    return 'paused'
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
