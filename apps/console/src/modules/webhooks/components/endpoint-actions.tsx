import Pen from '~icons/solar/pen-linear'
import type { JSX } from 'react'

import { EndpointFormDialog } from '@/modules/webhooks/components/endpoint-form-dialog'
import {
  useDeleteWebhookEndpointMutation,
  useUpdateWebhookEndpointMutation,
} from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

type EndpointActionsProps = {
  projectId: string
  endpoint: WebhookEndpointView
  isRotating: boolean
  onRotate: () => void
}

/** Edit, rotate the secret and delete; the two that cannot be undone ask first. */
export function EndpointActions(props: EndpointActionsProps): JSX.Element {
  const { endpoint } = props
  const update = useUpdateWebhookEndpointMutation(props.projectId)
  const remove = useDeleteWebhookEndpointMutation(props.projectId)

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <EndpointFormDialog
          title="Editar endpoint"
          submitLabel="Salvar"
          initial={{ url: endpoint.url, event_types: endpoint.event_types }}
          onSubmit={(body) => update.mutateAsync({ endpointId: endpoint.id, body })}
          isPending={update.isPending}
          trigger={{
            label: 'Editar',
            icon: Pen,
            variant: 'outline',
            size: 'sm',
            isDisabled: update.isPending,
          }}
        />
        <ConfirmButton
          title="Gerar um novo segredo?"
          description="O segredo atual continua assinando por 24 horas, junto com o novo. Troque no seu servidor dentro desse prazo."
          confirmLabel="Gerar segredo"
          isPending={props.isRotating}
          onConfirm={props.onRotate}
        >
          Novo segredo
        </ConfirmButton>
        <ConfirmButton
          title="Excluir este endpoint?"
          description="Ele para de receber eventos na hora, e as entregas pendentes são canceladas."
          confirmLabel="Excluir endpoint"
          isDestructive
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(endpoint.id)}
        >
          Excluir
        </ConfirmButton>
      </div>
      <ErrorAlert error={remove.error} />
    </div>
  )
}
