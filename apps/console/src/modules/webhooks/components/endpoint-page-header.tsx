import type { JSX } from 'react'

import { EndpointActions } from '@/modules/webhooks/components/endpoint-actions'
import { EndpointHeaderFacts } from '@/modules/webhooks/components/endpoint-header-facts'
import { endpointTitle } from '@/modules/webhooks/components/endpoint-host'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointToggle } from '@/modules/webhooks/components/endpoint-toggle'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import { TestSendMenu } from '@/modules/webhooks/components/test-send-menu'
import { PageHeader } from '@/shared/ui/page-header'

type EndpointTest = { isPending: boolean; onTest: (eventType: WebhookEventType | null) => void }

type EndpointPageHeaderProps = { panel: EndpointPanel; test: EndpointTest }

/** The endpoint's name (or host) as the title, its URL and facts under it; test, pause and menu aside. */
export function EndpointPageHeader({ panel, test }: EndpointPageHeaderProps): JSX.Element {
  const { projectId, endpoint } = panel

  return (
    <PageHeader
      title={endpointTitle(endpoint)}
      description={<EndpointHeaderFacts endpoint={endpoint} />}
      actions={
        <>
          <TestSendMenu
            eventTypes={endpoint.event_types}
            isPending={test.isPending}
            onSend={test.onTest}
          />
          <EndpointToggle projectId={projectId} endpoint={endpoint} />
          <EndpointActions panel={panel} />
        </>
      }
    />
  )
}
