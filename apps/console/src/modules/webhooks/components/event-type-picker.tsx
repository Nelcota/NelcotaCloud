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

/** Which events the endpoint receives, grouped by subject, each group with its own "all". */
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
    <div className="flex flex-col gap-4">
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
