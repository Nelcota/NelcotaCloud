import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import type { HealthKind } from '@/modules/webhooks/components/endpoint-health-state'
import { formatCount } from '@/shared/lib/format-number'
import { formatRelative } from '@/shared/lib/format-relative'

type SentenceWriter = (summary: DeliverySummary, now: number) => string

const SENTENCES: Record<HealthKind, SentenceWriter> = {
  paused: () => 'Nenhum evento é enviado até você retomar.',
  failing: (summary) =>
    `${counted(summary.failedLastDay, 'falha', 'falhas')} nas últimas 24 horas. ${accepted(summary)}`,
  retrying: (summary) =>
    `${counted(summary.pending, 'entrega aguarda', 'entregas aguardam')} nova tentativa. ${accepted(summary)}`,
  idle: () => 'Nenhum evento saiu ainda. Eventos de teste não entram no histórico.',
  delivering: (summary, now) => `${accepted(summary)}${lastSent(summary, now)}`,
}

/** The plain sentence after the verdict, built only from the loaded deliveries. */
export function healthSentence(kind: HealthKind, summary: DeliverySummary, now: number): string {
  return SENTENCES[kind](summary, now)
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
