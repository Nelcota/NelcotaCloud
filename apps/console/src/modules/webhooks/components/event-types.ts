import type { components } from '@/shared/api/api-schema'

export type WebhookEventType = components['schemas']['WebhookEventType']

/** Every event an endpoint can receive, in the order the form lists them. */
export const EVENT_TYPE_LABELS: Record<WebhookEventType, string> = {
  'user.created': 'Usuário criado',
  'user.updated': 'Usuário alterado',
  'user.deleted': 'Usuário excluído',
  'user.banned': 'Usuário bloqueado',
  'user.unbanned': 'Usuário desbloqueado',
  'session.revoked': 'Sessões encerradas',
  'audit.event': 'Evento de auditoria',
}

export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS).filter(isEventType)

function isEventType(value: string): value is WebhookEventType {
  return value in EVENT_TYPE_LABELS
}

/** The chosen events by name, in the order the form lists them. */
export function eventNames(eventTypes: readonly string[]): string {
  return EVENT_TYPES.filter((eventType) => eventTypes.includes(eventType))
    .map((eventType) => EVENT_TYPE_LABELS[eventType])
    .join(', ')
}

export function eventCountLabel(count: number): string {
  if (count === 1) {
    return '1 evento'
  }

  return `${count} eventos`
}

/** Whether two choices hold the same events, whatever their order. */
export function isSameEventChoice(
  first: readonly WebhookEventType[],
  second: readonly WebhookEventType[],
): boolean {
  if (first.length !== second.length) {
    return false
  }

  return first.every((eventType) => second.includes(eventType))
}
