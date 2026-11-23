import type { components } from '@/shared/api/api-schema'

export type NotificationEvent = components['schemas']['NotificationEvent']
export type ChannelKind = components['schemas']['ChannelKind']

type EventInfo = { value: NotificationEvent; label: string; description: string }

export const NOTIFICATION_EVENTS: readonly EventInfo[] = [
  {
    value: 'webhook_failing',
    label: 'Webhook falhando',
    description: 'Um endpoint recusa entregas há 6 horas, ou foi pausado.',
  },
  {
    value: 'login_failures',
    label: 'Logins recusados',
    description: '30 senhas erradas ou mais em 15 minutos.',
  },
  {
    value: 'data_api_errors',
    label: 'Erros na Data API',
    description: '20 erros de servidor ou mais em uma hora, acima de 5%.',
  },
  {
    value: 'storage_near_limit',
    label: 'Armazenamento quase cheio',
    description: 'Os arquivos passam de 80% do limite do projeto.',
  },
]

export const KIND_LABELS: Record<ChannelKind, string> = {
  email: 'Email',
  discord: 'Discord',
  slack: 'Slack',
}

export function eventLabel(event: NotificationEvent): string {
  return NOTIFICATION_EVENTS.find((info) => info.value === event)?.label ?? event
}

/** What the target field asks for, by kind. */
export const TARGET_FIELDS: Record<ChannelKind, { label: string; placeholder: string }> = {
  email: { label: 'Endereço', placeholder: 'alertas@empresa.com' },
  discord: { label: 'URL do webhook', placeholder: 'https://discord.com/api/webhooks/…' },
  slack: { label: 'URL do webhook', placeholder: 'https://hooks.slack.com/services/…' },
}
