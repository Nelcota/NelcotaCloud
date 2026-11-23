import type { JSX } from 'react'

import {
  NOTIFICATION_EVENTS,
  type NotificationEvent,
  toggleEvent,
} from '@/modules/notifications/model/notification-events'
import { CheckField } from '@/shared/ui/check-field'

type EventsFieldProps = {
  selected: readonly NotificationEvent[]
  onChange: (events: NotificationEvent[]) => void
}

/** Which alerts the channel receives; at least one stays ticked for the form to save. */
export function EventsField({ selected, onChange }: EventsFieldProps): JSX.Element {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">Avisar quando</legend>
      {NOTIFICATION_EVENTS.map((event) => (
        <CheckField
          key={event.value}
          label={event.label}
          description={event.description}
          isChecked={selected.includes(event.value)}
          onChange={(isChecked) => onChange(toggleEvent(selected, event.value, isChecked))}
        />
      ))}
    </fieldset>
  )
}
