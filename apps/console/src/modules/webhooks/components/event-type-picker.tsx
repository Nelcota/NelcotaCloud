import type { JSX } from 'react'

import { EventGroupFieldset } from '@/modules/webhooks/components/event-group-fieldset'
import { EVENT_GROUPS } from '@/modules/webhooks/components/event-groups'
import { EVENT_TYPES, type WebhookEventType } from '@/modules/webhooks/components/event-types'

type EventTypePickerProps = {
  selected: readonly WebhookEventType[]
  onChange: (selected: WebhookEventType[]) => void
  /** Adds each event's meaning under it; the create dialog keeps to names to stay short. */
  hasMeanings?: boolean
}

/**
 * Which events the endpoint receives, grouped by subject, each group with its own "all". On a
 * wide panel the groups sit side by side; a dialog keeps them stacked.
 */
export function EventTypePicker({
  selected,
  onChange,
  hasMeanings,
}: EventTypePickerProps): JSX.Element {
  function change(group: readonly WebhookEventType[], picked: readonly WebhookEventType[]): void {
    const kept = selected.filter((eventType) => group.includes(eventType) === false)
    const next = [...kept, ...picked]

    onChange(EVENT_TYPES.filter((eventType) => next.includes(eventType)))
  }

  return (
    <div className="grid items-start gap-4 @min-[44rem]:grid-cols-2">
      {EVENT_GROUPS.map((group) => (
        <EventGroupFieldset
          key={group.label}
          group={group}
          hasMeanings={hasMeanings === true}
          selected={selected.filter((eventType) => group.eventTypes.includes(eventType))}
          onChange={(picked) => change(group.eventTypes, picked)}
        />
      ))}
    </div>
  )
}
