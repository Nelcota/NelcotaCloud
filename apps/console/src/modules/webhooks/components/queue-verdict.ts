import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import type { NoticeTone } from '@/shared/ui/notice'

type QueueHealth = components['schemas']['QueueHealth']
type QueueCount = components['schemas']['QueueCount']

export type QueueVerdict = { tone: NoticeTone; verdict: string; sentence: string }

/** The queue in one verdict: late deliveries first, then give-ups, paused, waiting or clear. */
export function queueVerdict(health: QueueHealth): QueueVerdict {
  if (health.overdue.value > 0) {
    return {
      tone: 'warning',
      verdict: 'Atrasado.',
      sentence: `${deliveries(health.overdue)} já ${deliveryVerb(health.overdue, 'deveria', 'deveriam')} ter saído.`,
    }
  }

  if (health.failed_last_day.value > 0) {
    return {
      tone: 'error',
      verdict: 'Com falhas.',
      sentence: `${deliveries(health.failed_last_day)} ${deliveryVerb(health.failed_last_day, 'desistiu', 'desistiram')} nas últimas 24 horas, depois de todas as tentativas.`,
    }
  }

  if (health.active_endpoints === 0) {
    return {
      tone: 'info',
      verdict: 'Pausado.',
      sentence: 'Nenhum endpoint ativo: os eventos não saem até você retomar um.',
    }
  }

  return clearVerdict(health.pending)
}

function clearVerdict(pending: QueueCount): QueueVerdict {
  if (pending.value > 0) {
    return {
      tone: 'success',
      verdict: 'Em dia.',
      sentence: `${deliveries(pending)} na fila, nenhuma atrasada.`,
    }
  }

  return {
    tone: 'success',
    verdict: 'Em dia.',
    sentence: 'Nada na fila e nenhuma falha nas últimas 24 horas.',
  }
}

/** A count the API may cap: "10 mil+" when there are more than it counted. */
export function formatQueueCount(count: QueueCount): string {
  if (count.is_capped) {
    return `${formatCount(count.value)}+`
  }

  return formatCount(count.value)
}

function deliveries(count: QueueCount): string {
  if (count.value === 1 && count.is_capped === false) {
    return '1 entrega'
  }

  return `${formatQueueCount(count)} entregas`
}

function deliveryVerb(count: QueueCount, singular: string, plural: string): string {
  if (count.value === 1 && count.is_capped === false) {
    return singular
  }

  return plural
}
