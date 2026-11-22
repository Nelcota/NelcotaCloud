import type { JSX } from 'react'

import type {
  SecretRotation,
  WebhookEndpoint,
} from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointWorkspace } from '@/modules/webhooks/components/endpoint-workspace'
import type { EndpointSelection } from '@/modules/webhooks/components/use-endpoint-selection'
import { WebhooksIntro } from '@/modules/webhooks/components/webhooks-intro'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type WebhooksContentProps = {
  projectId: string
  /** `undefined` while loading. */
  endpoints: readonly WebhookEndpoint[] | undefined
  hasFailed: boolean
  limit: number
  selection: EndpointSelection
  rotation: SecretRotation
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
    return <WebhooksIntro />
  }

  return <EndpointWorkspace {...props} endpoints={endpoints} />
}

function WorkspaceSkeleton(): JSX.Element {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
