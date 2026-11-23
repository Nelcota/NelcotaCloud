import PlugCircle from '~icons/solar/plug-circle-linear'
import type { JSX } from 'react'
import { useId, useState } from 'react'

import { hostOf } from '@/modules/webhooks/model/endpoint-host'
import { useUpdateWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { useReadOnlyReason } from '@/shared/auth/write-access'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Switch } from '@/shared/ui/switch'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointEnabledSwitchProps = { projectId: string; endpoint: WebhookEndpointView }

/**
 * Resuming is immediate; pausing asks first, because the pending deliveries are dropped and the
 * events that happen during the pause are never sent.
 */
export function EndpointEnabledSwitch({
  projectId,
  endpoint,
}: EndpointEnabledSwitchProps): JSX.Element {
  const toggle = useUpdateWebhookEndpointMutation(projectId)
  const readOnlyReason = useReadOnlyReason()
  const [isConfirming, setIsConfirming] = useState(false)
  const switchId = useId()

  function setEnabled(isEnabled: boolean): void {
    if (isEnabled === false) {
      setIsConfirming(true)
      return
    }

    toggle.mutate({ endpointId: endpoint.id, body: { is_enabled: true } })
  }

  async function pause(): Promise<void> {
    await toggle.mutateAsync({ endpointId: endpoint.id, body: { is_enabled: false } })
  }

  return (
    <>
      <label
        htmlFor={switchId}
        title={readOnlyReason ?? undefined}
        className="flex cursor-pointer items-center gap-2 text-sm"
      >
        <Switch
          id={switchId}
          checked={endpoint.is_enabled}
          disabled={toggle.isPending || readOnlyReason !== null}
          onCheckedChange={setEnabled}
        />
        Ativo
      </label>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={`Pausar o endpoint de ${hostOf(endpoint.url)}?`}
        description="As entregas pendentes são descartadas, e os eventos que acontecerem durante a pausa nunca são enviados, nem depois de retomar."
        confirmLabel="Pausar endpoint"
        change={{ subject: endpoint.url, icon: PlugCircle, from: 'Recebendo', to: 'Pausado' }}
        isDestructive
        onConfirm={pause}
      />
    </>
  )
}
