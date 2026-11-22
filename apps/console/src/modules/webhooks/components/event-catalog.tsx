import type { JSX } from 'react'

import { EVENT_TYPE_MEANINGS } from '@/modules/webhooks/components/event-meanings'
import { EVENT_GROUPS } from '@/modules/webhooks/components/event-groups'

/** Every event an endpoint can subscribe to, by subject, wire name and meaning. */
export function EventCatalog(): JSX.Element {
  return (
    <div className="grid content-start gap-4">
      {EVENT_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
          <dl className="divide-y divide-border/60 rounded-xl bg-surface">
            {group.eventTypes.map((eventType) => (
              <div key={eventType} className="grid gap-0.5 px-3 py-2">
                <dt className="font-mono text-xs text-foreground">{eventType}</dt>
                <dd className="text-xs text-muted-foreground">{EVENT_TYPE_MEANINGS[eventType]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
