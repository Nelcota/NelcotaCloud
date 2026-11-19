import type { JSX } from 'react'
import { useId, useState } from 'react'

import { DeliveryLog } from '@/modules/webhooks/components/delivery-log'
import { EndpointActions } from '@/modules/webhooks/components/endpoint-actions'
import { EVENT_TYPE_LABELS } from '@/modules/webhooks/components/event-types'
import { TestWebhookButton } from '@/modules/webhooks/components/test-webhook-button'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/switch'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointCardProps = {
  projectId: string
  endpoint: WebhookEndpointView
  isIssuing: boolean
  isAwaitingConfirmation: boolean
  onRotate: () => Promise<void>
}

/** One endpoint: where it points, what it receives, whether it is on, and its deliveries. */
export function EndpointCard(props: EndpointCardProps): JSX.Element {
  const { endpoint, projectId } = props
  const toggle = useUpdateWebhookEndpointMutation(projectId)
  const switchId = useId()
  const [isLogOpen, setIsLogOpen] = useState(false)

  function setEnabled(isEnabled: boolean): void {
    toggle.mutate({ endpointId: endpoint.id, body: { is_enabled: isEnabled } })
  }

  return (
    <section className="surface grid gap-4 p-5" aria-label={endpoint.url}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid min-w-0 flex-1 gap-2">
          <code className="font-mono text-sm break-all">{endpoint.url}</code>
          <div className="flex flex-wrap gap-1.5">
            {endpoint.event_types.map((eventType) => (
              <Badge key={eventType}>{EVENT_TYPE_LABELS[eventType]}</Badge>
            ))}
          </div>
        </div>
        <label htmlFor={switchId} className="flex cursor-pointer items-center gap-2 text-sm">
          <Switch
            id={switchId}
            checked={endpoint.is_enabled}
            disabled={toggle.isPending}
            onCheckedChange={setEnabled}
          />
          Ativo
        </label>
      </div>
      <EndpointActions
        projectId={projectId}
        endpoint={endpoint}
        isIssuing={props.isIssuing}
        isAwaitingConfirmation={props.isAwaitingConfirmation}
        onRotate={props.onRotate}
      />
      <TestWebhookButton projectId={projectId} endpointId={endpoint.id} />
      <div className="grid gap-2 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          aria-expanded={isLogOpen}
          onClick={() => setIsLogOpen(isLogOpen === false)}
        >
          Entregas recentes
        </Button>
        <OpenDeliveryLog isOpen={isLogOpen} projectId={projectId} endpointId={endpoint.id} />
      </div>
    </section>
  )
}

type OpenDeliveryLogProps = { isOpen: boolean; projectId: string; endpointId: string }

/** Mounted only while open, so closed cards do not poll the log. */
function OpenDeliveryLog({
  isOpen,
  projectId,
  endpointId,
}: OpenDeliveryLogProps): JSX.Element | null {
  if (isOpen === false) {
    return null
  }

  return <DeliveryLog projectId={projectId} endpointId={endpointId} />
}
