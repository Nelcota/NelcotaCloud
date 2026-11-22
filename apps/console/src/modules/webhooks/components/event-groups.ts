import type { WebhookEventType } from '@/modules/webhooks/components/event-types'

export type EventGroup = { label: string; eventTypes: readonly WebhookEventType[] }

/** Events by subject, in the order the pickers and the catalog list them. */
export const EVENT_GROUPS: readonly EventGroup[] = [
  { label: 'Contas', eventTypes: ['user.created', 'user.updated', 'user.deleted'] },
  { label: 'Acesso', eventTypes: ['user.banned', 'user.unbanned', 'session.revoked'] },
  { label: 'Auditoria', eventTypes: ['audit.event'] },
]
