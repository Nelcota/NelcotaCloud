import Plus from '~icons/solar/add-linear'
import PlugCircle from '~icons/solar/plug-circle-linear'
import type { JSX } from 'react'

import { EndpointCard } from '@/modules/webhooks/components/endpoint-card'
import { EndpointFormDialog } from '@/modules/webhooks/components/endpoint-form-dialog'
import { WebhookSecretNotice } from '@/modules/webhooks/components/webhook-secret-notice'
import {
  useCreateWebhookEndpointMutation,
  useRotateWebhookSecretMutation,
  useWebhookEndpointsQuery,
} from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']
type WithSecret = components['schemas']['WebhookEndpointWithSecret']

/** Most projects have at most a few receivers; the API allows five. */
const MAX_ENDPOINTS = 5

export function WebhooksPage(): JSX.Element {
  const projectId = useProjectId()
  const endpoints = useWebhookEndpointsQuery(projectId)
  const creation = useCreateWebhookEndpointMutation(projectId)
  const rotation = useRotateWebhookSecretMutation(projectId)
  const count = endpoints.data?.length ?? 0
  const createButton = (
    <EndpointFormDialog
      title="Novo endpoint"
      submitLabel="Criar endpoint"
      initial={{ url: '', event_types: ['user.created'] }}
      onSubmit={(body) => creation.mutateAsync(body)}
      isPending={creation.isPending}
      trigger={{
        label: 'Novo endpoint',
        icon: Plus,
        variant: 'default',
        size: 'default',
        isDisabled: creation.isPending || count >= MAX_ENDPOINTS,
      }}
    />
  )

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Webhooks"
        description="Seu servidor recebe um POST assinado quando um usuário é criado, alterado, bloqueado ou excluído. Falhas são reenviadas por até um dia e meio."
        actions={createButton}
      />
      <LoadError error={endpoints.error} onRetry={() => endpoints.refetch()} />
      <WebhookSecretNotice
        revealed={revealedSecret(creation.data ?? rotation.data)}
        onDismiss={() => {
          creation.reset()
          rotation.reset()
        }}
      />
      <EndpointList
        projectId={projectId}
        endpoints={endpoints.data}
        hasFailed={endpoints.isError}
        isRotating={rotation.isPending}
        onRotate={async (endpointId) => {
          await rotation.mutateAsync(endpointId)
        }}
        emptyAction={createButton}
      />
    </div>
  )
}

function revealedSecret(
  created: WithSecret | undefined,
): { url: string; secret: string } | undefined {
  if (created === undefined) {
    return undefined
  }

  return { url: created.endpoint.url, secret: created.secret }
}

type EndpointListProps = {
  projectId: string
  endpoints: WebhookEndpointView[] | undefined
  hasFailed: boolean
  isRotating: boolean
  onRotate: (endpointId: string) => Promise<void>
  emptyAction: JSX.Element
}

function EndpointList(props: EndpointListProps): JSX.Element | null {
  if (props.endpoints === undefined && props.hasFailed) {
    return null
  }

  if (props.endpoints === undefined) {
    return <Skeleton className="h-40 rounded-xl" />
  }

  if (props.endpoints.length === 0) {
    return (
      <EmptyState
        icon={PlugCircle}
        title="Nenhum endpoint"
        description="Adicione a URL do seu servidor para receber os eventos dos usuários deste projeto."
        action={props.emptyAction}
      />
    )
  }

  return (
    <div className="grid gap-4">
      {props.endpoints.map((endpoint) => (
        <EndpointCard
          key={endpoint.id}
          projectId={props.projectId}
          endpoint={endpoint}
          isRotating={props.isRotating}
          onRotate={() => props.onRotate(endpoint.id)}
        />
      ))}
    </div>
  )
}
