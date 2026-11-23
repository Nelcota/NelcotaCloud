import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import type { HealthKind } from '@/modules/webhooks/components/endpoint-health-state'
import { formatCount } from '@/shared/lib/format-number'
import { formatRelative } from '@/shared/lib/format-relative'

/** When the sentence is read, and since when the endpoint refuses deliveries (`null`: it does not). */
export type SentenceContext = { now: number; failingSince: string | null }

type SentenceWriter = (summary: DeliverySummary, context: SentenceContext) => string

const SENTENCES: Record<HealthKind, SentenceWriter> = {
  auto_paused: () =>
    'Recusou as entregas por 5 dias seguidos. Ligue de novo depois de corrigir o servidor.',
  paused: () => 'Os eventos desta pausa não são enviados, nem depois de retomar.',
  failing: (summary, context) =>
    `${refusingSince(context)}${counted(summary.failedLastDay, 'falha', 'falhas')} nas últimas 24 horas. ${accepted(summary)}`,
  retrying: (summary, context) =>
    `${refusingSince(context)}${counted(summary.pending, 'entrega aguarda', 'entregas aguardam')} nova tentativa. ${accepted(summary)}`,
  idle: () => 'Nenhum evento saiu ainda. Eventos de teste não entram no histórico.',
  delivering: (summary, context) => `${accepted(summary)}${lastSent(summary, context.now)}`,
}

/** The plain sentence after the verdict, built only from the loaded deliveries. */
export function healthSentence(
  kind: HealthKind,
  summary: DeliverySummary,
  context: SentenceContext,
): string {
  return SENTENCES[kind](summary, context)
}

/** "Começou a recusar entregas há 7h. " when the run of failures is known. */
function refusingSince(context: SentenceContext): string {
  if (context.failingSince === null) {
    return ''
  }

  return `Começou a recusar entregas ${formatRelative(context.failingSince, context.now)}. `
}

function accepted(summary: DeliverySummary): string {
  const total = summary.delivered + summary.failed + summary.pending

  return `${formatCount(summary.delivered)} de ${formatCount(total)} entregas recentes aceitas.`
}

function lastSent(summary: DeliverySummary, now: number): string {
  const newest = summary.newest

  if (newest === null) {
    return ''
  }

  return ` A última saiu ${formatRelative(newest.created_at, now)}.`
}

function counted(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`
  }

  return `${formatCount(count)} ${plural}`
}
