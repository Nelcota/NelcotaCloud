import type { JSX } from 'react'

import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type WebhookEventType,
} from '@/modules/webhooks/components/event-types'

type EventTypePickerProps = {
  selected: readonly WebhookEventType[]
  onChange: (selected: WebhookEventType[]) => void
}

/** Which events the endpoint receives; the type is shown next to its name, as the API sends it. */
export function EventTypePicker({ selected, onChange }: EventTypePickerProps): JSX.Element {
  function toggle(eventType: WebhookEventType, isChecked: boolean): void {
    const others = selected.filter((current) => current !== eventType)

    if (isChecked) {
      onChange([...others, eventType])
      return
    }

    onChange(others)
  }

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">Eventos</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {EVENT_TYPES.map((eventType) => (
          <label
            key={eventType}
            className="hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              className="accent-primary size-4 cursor-pointer"
              checked={selected.includes(eventType)}
              onChange={(event) => toggle(eventType, event.target.checked)}
            />
            <span>{EVENT_TYPE_LABELS[eventType]}</span>
            <code className="text-muted-foreground font-mono text-xs">{eventType}</code>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
