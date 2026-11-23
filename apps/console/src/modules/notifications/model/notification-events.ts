import type { components } from '@/shared/api/api-schema'

export type NotificationEvent = components['schemas']['NotificationEvent']
export type ChannelKind = components['schemas']['ChannelKind']

type EventInfo = { value: NotificationEvent; label: string; description: string }

/** The API refuses a sixth channel; the add button stops before it. */
export const MAX_CHANNELS = 5

export const CHANNEL_KINDS: readonly ChannelKind[] = ['email', 'discord', 'slack']

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

type TargetField = { label: string; placeholder: string; missing: string }

const WEBHOOK_MISSING = 'Preencha a URL do webhook'

/** What the destination field asks for, by kind. */
export const TARGET_FIELDS: Record<ChannelKind, TargetField> = {
  email: {
    label: 'Endereço de email',
    placeholder: 'alertas@empresa.com',
    missing: 'Preencha o endereço de email',
  },
  discord: {
    label: 'URL do webhook',
    placeholder: 'https://discord.com/api/webhooks/…',
    missing: WEBHOOK_MISSING,
  },
  slack: {
    label: 'URL do webhook',
    placeholder: 'https://hooks.slack.com/services/…',
    missing: WEBHOOK_MISSING,
  },
}

export type ChannelDraft = { kind: ChannelKind; target: string; events: NotificationEvent[] }

/** A new channel starts with every alert, the common choice. */
export function blankDraft(): ChannelDraft {
  return { kind: 'email', target: '', events: NOTIFICATION_EVENTS.map((event) => event.value) }
}

export function eventLabel(event: NotificationEvent): string {
  return NOTIFICATION_EVENTS.find((info) => info.value === event)?.label ?? event
}

/** What the draft still needs before it can be saved; `null` once it is complete. */
export function draftMissing(draft: ChannelDraft): string | null {
  if (draft.target.trim() === '') {
    return TARGET_FIELDS[draft.kind].missing
  }

  return eventsMissing(draft.events)
}

export function eventsMissing(events: readonly NotificationEvent[]): string | null {
  if (events.length === 0) {
    return 'Escolha pelo menos um aviso'
  }

  return null
}

/** Ticks or unticks one event, keeping the others. */
export function toggleEvent(
  events: readonly NotificationEvent[],
  event: NotificationEvent,
  isChecked: boolean,
): NotificationEvent[] {
  const others = events.filter((value) => value !== event)

  if (isChecked) {
    return [...others, event]
  }

  return others
}
