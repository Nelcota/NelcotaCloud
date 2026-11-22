import { useRef, type JSX } from 'react'

import { EndpointDetail } from '@/modules/webhooks/components/endpoint-detail'
import { EndpointList } from '@/modules/webhooks/components/endpoint-list'
import type {
  SecretRotation,
  WebhookEndpoint,
} from '@/modules/webhooks/components/endpoint-panel-types'
import type { EndpointSelection } from '@/modules/webhooks/components/use-endpoint-selection'
import { useMediaQuery } from '@/shared/lib/use-media-query'

/** Below the large breakpoint the detail sits under the list instead of beside it. */
const STACKED_QUERY = '(max-width: 1023px)'

type EndpointWorkspaceProps = {
  projectId: string
  endpoints: readonly WebhookEndpoint[]
  limit: number
  selection: EndpointSelection
  rotation: SecretRotation
}

/** Master and detail: the endpoints on the left, the selected one as a full panel beside them. */
export function EndpointWorkspace(props: EndpointWorkspaceProps): JSX.Element {
  const { endpoints, selection } = props
  const detail = useRef<HTMLDivElement>(null)
  const isStacked = useMediaQuery(STACKED_QUERY)
  const selected = endpoints.find((endpoint) => endpoint.id === selection.selectedId)

  // Stacked, the detail is below the fold: bring it into view so the tap visibly does something.
  function select(endpointId: string): void {
    selection.select(endpointId)

    if (isStacked) {
      detail.current?.scrollIntoView({ block: 'start' })
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-6">
      <EndpointList
        projectId={props.projectId}
        endpoints={endpoints}
        selectedId={selection.selectedId}
        onSelect={select}
        limit={props.limit}
      />
      <div ref={detail} className="min-w-0 scroll-mt-4">
        <SelectedDetail projectId={props.projectId} endpoint={selected} rotation={props.rotation} />
      </div>
    </div>
  )
}

type SelectedDetailProps = {
  projectId: string
  endpoint: WebhookEndpoint | undefined
  rotation: SecretRotation
}

function SelectedDetail({
  projectId,
  endpoint,
  rotation,
}: SelectedDetailProps): JSX.Element | null {
  if (endpoint === undefined) {
    return null
  }

  return <EndpointDetail key={endpoint.id} panel={{ projectId, endpoint, rotation }} />
}
