import { useEffect, useState, type JSX } from 'react'

import type { DeliveryFilter } from '@/modules/webhooks/components/delivery-filter'
import { EndpointHealth } from '@/modules/webhooks/components/endpoint-health'
import type { HealthAction } from '@/modules/webhooks/components/endpoint-health-state'
import { EndpointPageHeader } from '@/modules/webhooks/components/endpoint-page-header'
import type {
  EndpointPanel,
  WebhookEndpoint,
} from '@/modules/webhooks/components/endpoint-panel-types'
import { type EndpointTab, EndpointTabs } from '@/modules/webhooks/components/endpoint-tabs'
import type { WebhookEventType } from '@/modules/webhooks/components/event-types'
import type { EndpointTestSend } from '@/modules/webhooks/components/test-send-state'
import { useSecretRotation } from '@/modules/webhooks/components/use-secret-rotation'
import { WebhookSecretNotice } from '@/modules/webhooks/components/webhook-secret-notice'
import { useTestWebhookMutation } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { BackLink } from '@/shared/ui/back-link'

/** Long enough to read the test's answer; the log keeps the real deliveries. */
const TEST_RESULT_MS = 10_000

/** The health strip's steps open the log on the deliveries they are about. */
const FILTER_OF_ACTION: Record<HealthAction, DeliveryFilter> = {
  show_failed: 'failed',
  show_pending: 'pending',
}

type EndpointDetailProps = { projectId: string; endpoint: WebhookEndpoint }

/**
 * One endpoint's page: its address and controls, whether it delivers (with the step that fits),
 * then its deliveries, events, secret and settings. The health's step can open the log filtered.
 */
export function EndpointDetail({ projectId, endpoint }: EndpointDetailProps): JSX.Element {
  const [tab, setTab] = useState<EndpointTab>('deliveries')
  const [filter, setFilter] = useState<DeliveryFilter>('all')
  const test = useTestWebhookMutation(projectId)
  const secret = useSecretRotation(projectId, endpoint.url)
  const panel: EndpointPanel = { projectId, endpoint, rotation: secret.rotation }
  const sendTest = (eventType: WebhookEventType | null): void =>
    test.mutate({ endpointId: endpoint.id, eventType })
  useClearedAfterAWhile(test)

  function showDeliveries(action: HealthAction): void {
    setTab('deliveries')
    setFilter(FILTER_OF_ACTION[action])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <BackLink label="Webhooks" href={`/projects/${projectId}/webhooks`} />
        <EndpointPageHeader panel={panel} test={{ isPending: test.isPending, onTest: sendTest }} />
      </div>
      <WebhookSecretNotice revealed={secret.revealed} onDismiss={secret.dismiss} />
      <EndpointHealth
        projectId={projectId}
        endpoint={endpoint}
        test={test}
        onAction={showDeliveries}
      />
      <EndpointTabs
        panel={panel}
        view={{ tab, filter, onTabChange: setTab, onFilterChange: setFilter }}
      />
    </div>
  )
}

/** A test's answer gives the strip back to the endpoint's health after a few seconds. */
function useClearedAfterAWhile(test: EndpointTestSend): void {
  const { status, reset } = test

  useEffect(() => {
    if (status !== 'success' && status !== 'error') {
      return undefined
    }

    const timer = window.setTimeout(reset, TEST_RESULT_MS)

    return () => window.clearTimeout(timer)
  }, [status, reset])
}
