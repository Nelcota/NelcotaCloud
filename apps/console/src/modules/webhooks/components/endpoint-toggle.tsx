import type { JSX } from 'react'

import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { describeError } from '@/shared/api/describe-error'
import { Switch } from '@/shared/ui/primitives/switch'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointToggleProps = { projectId: string; endpoint: WebhookEndpointView }

/** Pauses or resumes an endpoint in place; a failure stays next to the switch that caused it. */
export function EndpointToggle({ projectId, endpoint }: EndpointToggleProps): JSX.Element {
  const toggle = useUpdateWebhookEndpointMutation(projectId)

  function setEnabled(isEnabled: boolean): void {
    toggle.mutate({ endpointId: endpoint.id, body: { is_enabled: isEnabled } })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        aria-label={`Receber eventos em ${hostOf(endpoint.url)}`}
        checked={endpoint.is_enabled}
        disabled={toggle.isPending}
        aria-busy={toggle.isPending}
        onCheckedChange={setEnabled}
      />
      <ToggleError error={toggle.error} />
    </div>
  )
}

function ToggleError({ error }: { error: Error | null }): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <p role="alert" className="text-xs whitespace-normal text-destructive">
      {describeError(error)}
    </p>
  )
}
