import type { JSX } from 'react'

import { EVENT_TYPES } from '@/modules/webhooks/components/event-types'

/** The first subscribed event by its wire name and how many more; the title lists them all. */
export function EndpointEventsCell({ eventTypes }: { eventTypes: readonly string[] }): JSX.Element {
  const subscribed = EVENT_TYPES.filter((eventType) => eventTypes.includes(eventType))
  const first = subscribed.at(0) ?? ''
  const others = subscribed.length - 1

  return (
    <span title={subscribed.join(', ')} className="inline-flex items-center gap-1.5">
      <code className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-2xs text-foreground">
        {first}
      </code>
      <MoreEvents count={others} />
    </span>
  )
}

function MoreEvents({ count }: { count: number }): JSX.Element | null {
  if (count < 1) {
    return null
  }

  return <span className="text-xs text-muted-foreground tabular-nums">+{count}</span>
}
