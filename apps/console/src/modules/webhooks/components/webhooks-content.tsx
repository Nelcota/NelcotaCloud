import type { JSX } from 'react'

import type { EndpointCreator } from '@/modules/webhooks/components/create-endpoint-button'
import type {
  SecretRotation,
  WebhookEndpoint,
} from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointWorkspace } from '@/modules/webhooks/components/endpoint-workspace'
import type { EndpointSelection } from '@/modules/webhooks/components/use-endpoint-selection'
import { WebhooksIntro } from '@/modules/webhooks/components/webhooks-intro'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = ['first', 'second', 'third']

type WebhooksContentProps = {
  projectId: string
  /** `undefined` while loading. */
  endpoints: readonly WebhookEndpoint[] | undefined
  hasFailed: boolean
  limit: number
  selection: EndpointSelection
  rotation: SecretRotation
  /** The empty page's own button; the header leaves the action to it. */
  creator: EndpointCreator
}

/** Loading, empty or the workspace; nothing while the page's load error already says it all. */
export function WebhooksContent(props: WebhooksContentProps): JSX.Element | null {
  const { endpoints } = props

  if (endpoints === undefined && props.hasFailed) {
    return null
  }

  if (endpoints === undefined) {
    return <WorkspaceSkeleton />
  }

  if (endpoints.length === 0) {
    return <WebhooksIntro creator={props.creator} />
  }

  return <EndpointWorkspace {...props} endpoints={endpoints} />
}

/** Shaped like the workspace: the endpoint rows on the left, header, summary and feed beside. */
function WorkspaceSkeleton(): JSX.Element {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-6">
      <div className="flex flex-col gap-1">
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-14 rounded-md" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
