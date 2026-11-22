import type { JSX } from 'react'

import { EVENT_TYPE_MEANINGS } from '@/modules/webhooks/components/event-meanings'
import { EVENT_GROUPS } from '@/modules/webhooks/components/event-groups'

/** Every event an endpoint can subscribe to, by subject, wire name and meaning. */
export function EventCatalog(): JSX.Element {
  return (
    <div className="grid content-start gap-5">
      {EVENT_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-2">
          <h3 className="text-sm font-semibold">{group.label}</h3>
          <dl className="divide-y rounded-lg border">
            {group.eventTypes.map((eventType) => (
              <div key={eventType} className="grid gap-0.5 px-3 py-2.5">
                <dt className="font-mono text-sm text-foreground">{eventType}</dt>
                <dd className="text-sm text-muted-foreground">{EVENT_TYPE_MEANINGS[eventType]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
