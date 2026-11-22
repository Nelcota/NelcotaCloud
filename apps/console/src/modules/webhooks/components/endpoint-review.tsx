import type { JSX } from 'react'

import { EVENT_GROUPS } from '@/modules/webhooks/components/event-groups'
import { EVENT_TYPE_LABELS, type WebhookEventType } from '@/modules/webhooks/components/event-types'
import { DataList, DataListItem } from '@/shared/ui/data-list'

type EndpointReviewProps = {
  url: string
  /** Empty when the endpoint has no name. */
  name: string
  eventTypes: readonly WebhookEventType[]
}

/** The last step of the form: the address, the name and the chosen events, by subject. */
export function EndpointReview({ url, name, eventTypes }: EndpointReviewProps): JSX.Element {
  const groups = EVENT_GROUPS.map((group) => ({
    label: group.label,
    picked: group.eventTypes.filter((eventType) => eventTypes.includes(eventType)),
  })).filter((group) => group.picked.length > 0)

  return (
    <DataList className="rounded-xl bg-surface px-4">
      <DataListItem label="URL">
        <code className="font-mono text-xs wrap-anywhere">{url}</code>
      </DataListItem>
      <NameItem name={name} />
      {groups.map((group) => (
        <DataListItem key={group.label} label={group.label}>
          {group.picked.map((eventType) => EVENT_TYPE_LABELS[eventType]).join(', ')}
        </DataListItem>
      ))}
    </DataList>
  )
}

function NameItem({ name }: { name: string }): JSX.Element | null {
  if (name === '') {
    return null
  }

  return <DataListItem label="Nome">{name}</DataListItem>
}
