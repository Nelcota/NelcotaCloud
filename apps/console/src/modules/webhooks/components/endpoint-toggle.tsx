import { useId, useState, type JSX } from 'react'

import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { describeError } from '@/shared/api/describe-error'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Switch } from '@/shared/ui/primitives/switch'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointToggleProps = { projectId: string; endpoint: WebhookEndpointView }

/**
 * Pauses or resumes an endpoint in place, its state written beside the switch. Pausing asks
 * first: the server gives up the pending deliveries and records nothing for it while paused.
 */
export function EndpointToggle({ projectId, endpoint }: EndpointToggleProps): JSX.Element {
  const toggle = useUpdateWebhookEndpointMutation(projectId)
  const stateId = useId()
  const [isConfirmingPause, setIsConfirmingPause] = useState(false)
  const host = hostOf(endpoint.url)

  function setEnabled(isEnabled: boolean): void {
    if (isEnabled === false) {
      setIsConfirmingPause(true)
      return
    }

    toggle.mutate({ endpointId: endpoint.id, body: { is_enabled: true } })
  }

  async function pause(): Promise<void> {
    await toggle.mutateAsync({ endpointId: endpoint.id, body: { is_enabled: false } })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex h-10 items-center gap-2 rounded-md bg-surface ps-3 pe-2">
        <span id={stateId} className="text-sm text-muted-foreground">
          <StateText isEnabled={endpoint.is_enabled} />
        </span>
        <Switch
          aria-label={`Receber eventos em ${host}`}
          aria-describedby={stateId}
          checked={endpoint.is_enabled}
          disabled={toggle.isPending}
          aria-busy={toggle.isPending}
          onCheckedChange={setEnabled}
        />
      </div>
      <ToggleError error={toggle.error} />
      <ConfirmDialog
        isOpen={isConfirmingPause}
        onOpenChange={setIsConfirmingPause}
        title={`Pausar ${host}?`}
        description="As entregas pendentes são canceladas e os eventos que acontecerem durante a pausa não serão enviados, nem depois de retomar."
        confirmLabel="Pausar endpoint"
        isWeighty
        onConfirm={pause}
      />
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
