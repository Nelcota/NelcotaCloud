import { ChevronDown, Send } from 'lucide-react'
import type { JSX } from 'react'

import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type WebhookEventType,
} from '@/modules/webhooks/components/event-types'
import { PendingButton } from '@/shared/ui/pending-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type TestSendMenuProps = {
  /** The endpoint's events, offered as made-up samples its handler really receives. */
  eventTypes: readonly WebhookEventType[]
  isPending: boolean
  /** `null` sends the plain `webhook.test`. */
  onSend: (eventType: WebhookEventType | null) => void
}

/** Sends a signed test now: the plain test event, or a sample of one of the endpoint's events. */
export function TestSendMenu({ eventTypes, isPending, onSend }: TestSendMenuProps): JSX.Element {
  const subscribed = EVENT_TYPES.filter((eventType) => eventTypes.includes(eventType))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PendingButton type="button" variant="outline" isPending={isPending}>
          <Send aria-hidden data-icon="inline-start" />
          Enviar teste
          <ChevronDown aria-hidden data-icon="inline-end" />
        </PendingButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuItem onSelect={() => onSend(null)}>
          <EventItem label="Evento de teste" eventType="webhook.test" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Exemplo de um evento assinado</DropdownMenuLabel>
        {subscribed.map((eventType) => (
          <DropdownMenuItem key={eventType} onSelect={() => onSend(eventType)}>
            <EventItem label={EVENT_TYPE_LABELS[eventType]} eventType={eventType} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EventItem({ label, eventType }: { label: string; eventType: string }): JSX.Element {
  return (
    <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
      <span>{label}</span>
      <code className="font-mono text-2xs text-muted-foreground">{eventType}</code>
    </span>
  )
}
