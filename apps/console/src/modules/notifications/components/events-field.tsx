import type { JSX } from 'react'

import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from '@/modules/notifications/components/notification-events'
import { FieldLegend, FieldSet } from '@/shared/ui/primitives/field'
import { CheckboxField } from '@/shared/ui/switch-field'

type EventsFieldProps = {
  selected: readonly NotificationEvent[]
  onChange: (events: NotificationEvent[]) => void
}

/** Which alerts the channel receives; at least one stays ticked for the form to save. */
export function EventsField({ selected, onChange }: EventsFieldProps): JSX.Element {
  function toggle(event: NotificationEvent, isChecked: boolean): void {
    const others = selected.filter((value) => value !== event)

    if (isChecked) {
      onChange([...others, event])
      return
    }

    onChange(others)
  }

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Avisar quando</FieldLegend>
      {NOTIFICATION_EVENTS.map((event) => (
        <CheckboxField
          key={event.value}
          label={event.label}
          hint={event.description}
          checked={selected.includes(event.value)}
          onCheckedChange={(isChecked) => toggle(event.value, isChecked)}
        />
      ))}
    </FieldSet>
  )
}
