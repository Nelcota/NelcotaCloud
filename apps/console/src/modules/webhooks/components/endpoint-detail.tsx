import { useId, useState, type JSX } from 'react'

import type { DeliveryFilter } from '@/modules/webhooks/components/delivery-filter'
import { EndpointDetailHeader } from '@/modules/webhooks/components/endpoint-detail-header'
import { EndpointHealth } from '@/modules/webhooks/components/endpoint-health'
import type { HealthAction } from '@/modules/webhooks/components/endpoint-health-state'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { type EndpointTab, EndpointTabs } from '@/modules/webhooks/components/endpoint-tabs'
import { TestOutcome } from '@/modules/webhooks/components/test-outcome'
import { useTestWebhookMutation } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { ErrorAlert } from '@/shared/ui/error-alert'

/**
 * The selected endpoint's workspace: its address and state, the health sentence with the step
 * that fits it, then the tabs. The health's action can open the log already filtered.
 */
export function EndpointDetail({ panel }: { panel: EndpointPanel }): JSX.Element {
  const { projectId, endpoint } = panel
  const titleId = useId()
  const [tab, setTab] = useState<EndpointTab>('deliveries')
  const [filter, setFilter] = useState<DeliveryFilter>('all')
  const test = useTestWebhookMutation(projectId)
  const resume = useUpdateWebhookEndpointMutation(projectId)
  const sendTest = (): void => test.mutate(endpoint.id)

  function act(action: HealthAction): void {
    const actions: Record<HealthAction, () => void> = {
      resume: () => resume.mutate({ endpointId: endpoint.id, body: { is_enabled: true } }),
      test: sendTest,
      show_failed: () => showDeliveries('failed'),
      show_pending: () => showDeliveries('pending'),
    }

    actions[action]()
  }

  function showDeliveries(next: DeliveryFilter): void {
    setTab('deliveries')
    setFilter(next)
  }

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 animate-page-in flex-col gap-4">
      <EndpointDetailHeader panel={panel} titleId={titleId} onTest={sendTest} />
      <EndpointHealth
        projectId={projectId}
        endpoint={endpoint}
        isActing={test.isPending || resume.isPending}
        onAction={act}
      />
      <TestOutcome test={test} />
      <ErrorAlert error={resume.error} />
      <EndpointTabs
        panel={panel}
        view={{ tab, filter, onTabChange: setTab, onFilterChange: setFilter }}
      />
    </section>
  )
}
