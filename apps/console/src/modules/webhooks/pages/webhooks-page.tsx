import Plus from '~icons/solar/add-linear'
import PlugCircle from '~icons/solar/plug-circle-linear'
import type { JSX } from 'react'

import { EndpointCard } from '@/modules/webhooks/components/endpoint-card'
import { EndpointFormDialog } from '@/modules/webhooks/components/endpoint-form-dialog'
import { WebhookSecretNotice } from '@/modules/webhooks/components/webhook-secret-notice'
import { WebhookQueuePanel } from '@/modules/webhooks/components/webhook-queue-panel'
import { useWebhookEndpointsQuery } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { useWebhookSecretIssuance } from '@/modules/webhooks/queries/use-webhook-secret-issuance'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type WebhookEndpointView = components['schemas']['WebhookEndpointView']

export function WebhooksPage(): JSX.Element {
  const projectId = useProjectId()

  return <ProjectWebhooks key={projectId} projectId={projectId} />
}

function ProjectWebhooks({ projectId }: { projectId: string }): JSX.Element {
  const endpoints = useWebhookEndpointsQuery(projectId)
  const issuance = useWebhookSecretIssuance(projectId)
  const createButton = (
    <EndpointFormDialog
      title="Novo endpoint"
      submitLabel="Criar endpoint"
      initial={{ url: '', event_types: ['user.created'] }}
      onSubmit={issuance.create}
      trigger={{
        label: 'Novo endpoint',
        icon: Plus,
        variant: 'default',
        size: 'default',
        isDisabled: issuance.isIssuing || issuance.revealed !== undefined,
      }}
    />
  )

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Webhooks"
        description="Seu servidor recebe um POST assinado quando um usuário é criado, alterado, bloqueado ou excluído. Falhas são reenviadas por até 36 horas."
        actions={createButton}
      />
      <LoadError error={endpoints.error} onRetry={() => endpoints.refetch()} />
      <WebhookSecretNotice revealed={issuance.revealed} onDismiss={issuance.dismiss} />
      <WebhookQueuePanel projectId={projectId} />
      <EndpointList
        projectId={projectId}
        endpoints={endpoints.data}
        hasFailed={endpoints.isError}
        isIssuing={issuance.isIssuing}
        isAwaitingConfirmation={issuance.revealed !== undefined}
        onRotate={issuance.rotate}
      />
    </div>
  )
}

type EndpointListProps = {
  projectId: string
  endpoints: WebhookEndpointView[] | undefined
  hasFailed: boolean
  isIssuing: boolean
  isAwaitingConfirmation: boolean
  onRotate: (endpointId: string) => Promise<void>
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
          isIssuing={props.isIssuing}
          isAwaitingConfirmation={props.isAwaitingConfirmation}
          onRotate={() => props.onRotate(endpoint.id)}
        />
      ))}
    </div>
  )
}
