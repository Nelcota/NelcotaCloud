import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import type { StatusTone } from '@/shared/ui/status-badge'

export type HealthAction = 'resume' | 'test' | 'show_failed' | 'show_pending'

export type EndpointHealthState = {
  tone: StatusTone
  title: string
  action: HealthAction
  actionLabel: string
}

/** The one message that tells whether the endpoint works, and the action that fits it. */
export function healthOf(isEnabled: boolean, summary: DeliverySummary): EndpointHealthState {
  if (isEnabled === false) {
    return { tone: 'neutral', title: 'Pausado', action: 'resume', actionLabel: 'Retomar' }
  }

  if (summary.failedLastDay > 0) {
    const title = `${countLabel(summary.failedLastDay, 'falha', 'falhas')} nas últimas 24 h`

    return { tone: 'error', title, action: 'show_failed', actionLabel: 'Ver falhas' }
  }

  if (summary.pending > 0) {
    const title = `${countLabel(summary.pending, 'entrega', 'entregas')} tentando de novo`

    return { tone: 'warning', title, action: 'show_pending', actionLabel: 'Ver pendentes' }
  }

  if (summary.newest === null) {
    const title = 'Nenhuma entrega ainda'

    return { tone: 'neutral', title, action: 'test', actionLabel: 'Enviar evento de teste' }
  }

  const title = 'Entregando normalmente'

  return { tone: 'success', title, action: 'test', actionLabel: 'Enviar evento de teste' }
}

function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`
  }

  return `${count} ${plural}`
}
