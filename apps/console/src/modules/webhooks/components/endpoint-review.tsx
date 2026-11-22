import type { JSX } from 'react'

import { EVENT_GROUPS } from '@/modules/webhooks/components/event-groups'
import { EVENT_TYPE_LABELS, type WebhookEventType } from '@/modules/webhooks/components/event-types'
import { DataList, DataListItem } from '@/shared/ui/data-list'

type EndpointReviewProps = { url: string; eventTypes: readonly WebhookEventType[] }

/** The last step of the form: the address and the chosen events, by subject. */
export function EndpointReview({ url, eventTypes }: EndpointReviewProps): JSX.Element {
  const groups = EVENT_GROUPS.map((group) => ({
    label: group.label,
    picked: group.eventTypes.filter((eventType) => eventTypes.includes(eventType)),
  })).filter((group) => group.picked.length > 0)

  return (
    <DataList className="rounded-lg border px-4">
      <DataListItem label="URL">
        <code className="font-mono text-sm wrap-anywhere">{url}</code>
      </DataListItem>
      {groups.map((group) => (
        <DataListItem key={group.label} label={group.label}>
          {group.picked.map((eventType) => EVENT_TYPE_LABELS[eventType]).join(', ')}
        </DataListItem>
      ))}
    </DataList>
  )
}
