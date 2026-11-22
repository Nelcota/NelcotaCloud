import type { JSX } from 'react'

import type { EndpointCreator } from '@/modules/webhooks/components/create-endpoint-button'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointsTable } from '@/modules/webhooks/components/endpoints-table'
import { QueueSummary } from '@/modules/webhooks/components/queue-summary'
import { WebhooksIntro } from '@/modules/webhooks/components/webhooks-intro'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type WebhooksContentProps = {
  projectId: string
  /** `undefined` while loading. */
  endpoints: readonly WebhookEndpoint[] | undefined
  hasFailed: boolean
  limit: number
  /** The empty page's own button; the header leaves the action to it. */
  creator: EndpointCreator
}

/** Loading, empty, or the queue and the endpoints; nothing while the load error says it all. */
export function WebhooksContent(props: WebhooksContentProps): JSX.Element | null {
  const { projectId, endpoints, limit } = props

  if (endpoints === undefined && props.hasFailed) {
    return null
  }

  if (endpoints === undefined) {
    return <ContentSkeleton />
  }

  if (endpoints.length === 0) {
    return <WebhooksIntro creator={props.creator} />
  }

  return (
    <>
      <QueueSummary projectId={projectId} endpoints={{ count: endpoints.length, limit }} />
      <EndpointsTable projectId={projectId} endpoints={endpoints} limit={limit} />
    </>
  )
}

function ContentSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
