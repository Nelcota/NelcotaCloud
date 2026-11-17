import type { components } from '@/shared/api/api-schema'

export type WebhookEventType = components['schemas']['WebhookEventType']

/** Every event an endpoint can receive, in the order the form lists them. */
export const EVENT_TYPE_LABELS: Record<WebhookEventType, string> = {
  'user.created': 'Usuário criado',
  'user.updated': 'Usuário alterado',
  'user.deleted': 'Usuário excluído',
  'user.banned': 'Usuário banido',
  'user.unbanned': 'Banimento removido',
  'session.revoked': 'Sessões encerradas',
}

export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS).filter(isEventType)

function isEventType(value: string): value is WebhookEventType {
  return value in EVENT_TYPE_LABELS
}
