import { Plug as PlugCircle } from 'lucide-react'
import type { JSX } from 'react'

import { DELETE_DESCRIPTION } from '@/modules/webhooks/components/endpoint-copy'
import { EndpointFormDialog } from '@/modules/webhooks/components/endpoint-form-dialog'
import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { RotateSecretDialog } from '@/modules/webhooks/components/rotate-secret-dialog'
import {
  useDeleteWebhookEndpointMutation,
  useUpdateWebhookEndpointMutation,
} from '@/modules/webhooks/queries/use-webhook-endpoints'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

/** Which dialog of the panel's menu is open, if any. */
export type EndpointOverlay = 'edit' | 'rotate' | 'delete' | null

type EndpointDialogsProps = {
  panel: EndpointPanel
  overlay: EndpointOverlay
  onOpenChange: (isOpen: boolean) => void
}

/** Edit, new secret and delete, opened from the menu; the last two ask first. */
export function EndpointDialogs({
  panel,
  overlay,
  onOpenChange,
}: EndpointDialogsProps): JSX.Element {
  const { endpoint, rotation } = panel
  const update = useUpdateWebhookEndpointMutation(panel.projectId)
  const remove = useDeleteWebhookEndpointMutation(panel.projectId)

  async function deleteEndpoint(): Promise<void> {
    await remove.mutateAsync(endpoint.id)
  }

  return (
    <>
      <EndpointFormDialog
        isOpen={overlay === 'edit'}
        onOpenChange={onOpenChange}
        title="Editar endpoint"
        submitLabel="Salvar"
        initial={{ url: endpoint.url, event_types: endpoint.event_types }}
        onSubmit={(body) => update.mutateAsync({ endpointId: endpoint.id, body })}
      />
      <RotateSecretDialog
        isOpen={overlay === 'rotate'}
        onOpenChange={onOpenChange}
        host={hostOf(endpoint.url)}
        onRotate={() => rotation.onRotate(endpoint.id)}
      />
      <ConfirmDialog
        isOpen={overlay === 'delete'}
        onOpenChange={onOpenChange}
        title={`Excluir o endpoint de ${hostOf(endpoint.url)}?`}
        description={DELETE_DESCRIPTION}
        confirmLabel="Excluir endpoint"
        change={{ subject: endpoint.url, icon: PlugCircle, from: 'Recebendo', to: 'Excluído' }}
        isDestructive
        onConfirm={deleteEndpoint}
      />
    </>
  )
}
