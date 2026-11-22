import type { JSX } from 'react'
import { useState } from 'react'

import { CreateEndpointButton } from '@/modules/webhooks/components/create-endpoint-button'
import type { EndpointFormValues } from '@/modules/webhooks/components/endpoint-form-dialog'
import type { LastRotation } from '@/modules/webhooks/components/endpoint-panel-types'
import { useEndpointSelection } from '@/modules/webhooks/components/use-endpoint-selection'
import { WebhookSecretNotice } from '@/modules/webhooks/components/webhook-secret-notice'
import { webhookApiSnippets } from '@/modules/webhooks/components/webhook-api-snippets'
import { WebhooksContent } from '@/modules/webhooks/components/webhooks-content'
import {
  useCreateWebhookEndpointMutation,
  useRotateWebhookSecretMutation,
  useWebhookEndpointsQuery,
} from '@/modules/webhooks/queries/use-webhook-endpoints'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

type WithSecret = components['schemas']['WebhookEndpointWithSecret']

/** Most projects have at most a few receivers; the API allows five. */
const MAX_ENDPOINTS = 5

export function WebhooksPage(): JSX.Element {
  const projectId = useProjectId()
  const endpoints = useWebhookEndpointsQuery(projectId)
  const creation = useCreateWebhookEndpointMutation(projectId)
  const rotation = useRotateWebhookSecretMutation(projectId)
  const selection = useEndpointSelection(endpoints.data)
  const [lastRotation, setLastRotation] = useState<LastRotation | null>(null)
  const secret = revealedSecret(creation.data ?? rotation.data)
  const canIssueSecret =
    secret === undefined && creation.isPending === false && rotation.isPending === false
  const count = endpoints.data?.length ?? 0

  // The new endpoint opens at once, so its secret and its panel are seen together.
  async function create(values: EndpointFormValues): Promise<void> {
    const created = await creation.mutateAsync(values)
    selection.select(created.endpoint.id)
  }

  async function rotate(endpointId: string): Promise<void> {
    await rotation.mutateAsync(endpointId)
    setLastRotation({ endpointId, rotatedAt: Date.now() })
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Webhooks"
        description="Eventos assinados para o seu servidor, no formato Standard Webhooks."
        actions={
          <>
            <ApiSheet title="Webhooks pela API" snippets={webhookApiSnippets()} />
            <CreateEndpointButton
              creator={{
                isDisabled: canIssueSecret === false || count >= MAX_ENDPOINTS,
                onCreate: create,
              }}
            />
          </>
        }
      />
      <LoadError error={endpoints.error} onRetry={() => endpoints.refetch()} />
      <WebhookSecretNotice
        revealed={secret}
        onDismiss={() => {
          creation.reset()
          rotation.reset()
        }}
      />
      <WebhooksContent
        projectId={projectId}
        endpoints={endpoints.data}
        hasFailed={endpoints.isError}
        limit={MAX_ENDPOINTS}
        selection={selection}
        rotation={{
          canRotate: canIssueSecret,
          isRotating: rotation.isPending,
          lastRotation,
          onRotate: rotate,
        }}
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
