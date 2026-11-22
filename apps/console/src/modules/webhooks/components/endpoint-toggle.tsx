import { useId, type JSX } from 'react'

import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { describeError } from '@/shared/api/describe-error'
import { Switch } from '@/shared/ui/primitives/switch'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointToggleProps = { projectId: string; endpoint: WebhookEndpointView }

/** Pauses or resumes an endpoint in place, its state written beside the switch. */
export function EndpointToggle({ projectId, endpoint }: EndpointToggleProps): JSX.Element {
  const toggle = useUpdateWebhookEndpointMutation(projectId)
  const stateId = useId()

  function setEnabled(isEnabled: boolean): void {
    toggle.mutate({ endpointId: endpoint.id, body: { is_enabled: isEnabled } })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex h-9 items-center gap-2 rounded-md bg-surface ps-3 pe-2">
        <span id={stateId} className="text-sm text-muted-foreground">
          <StateText isEnabled={endpoint.is_enabled} />
        </span>
        <Switch
          aria-label={`Receber eventos em ${hostOf(endpoint.url)}`}
          aria-describedby={stateId}
          checked={endpoint.is_enabled}
          disabled={toggle.isPending}
          aria-busy={toggle.isPending}
          onCheckedChange={setEnabled}
        />
      </div>
      <ToggleError error={toggle.error} />
    </div>
  )
}

function StateText({ isEnabled }: { isEnabled: boolean }): JSX.Element {
  if (isEnabled) {
    return <>Ativo</>
  }

  return <>Pausado</>
}

function ToggleError({ error }: { error: Error | null }): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <p role="alert" className="max-w-64 text-xs whitespace-normal text-destructive">
      {describeError(error)}
    </p>
  )
}
