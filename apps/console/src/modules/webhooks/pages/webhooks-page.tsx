import type { JSX } from 'react'

import type { EndpointCreator } from '@/modules/webhooks/components/create-endpoint-button'
import { HeaderCreateAction } from '@/modules/webhooks/components/header-create-action'
import { WebhookSecretNotice } from '@/modules/webhooks/components/webhook-secret-notice'
import { webhookApiSnippets } from '@/modules/webhooks/components/webhook-api-snippets'
import { WebhooksContent } from '@/modules/webhooks/components/webhooks-content'
import {
  useCreateWebhookEndpointMutation,
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
  const secret = revealedSecret(creation.data)
  const count = endpoints.data?.length ?? 0
  // One secret on screen at a time: the next endpoint waits until this one is stored.
  const creator: EndpointCreator = {
    isDisabled: secret !== undefined || creation.isPending || count >= MAX_ENDPOINTS,
    onCreate: (values) => creation.mutateAsync(values),
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Webhooks"
        description="Eventos assinados para o seu servidor, no formato Standard Webhooks."
        actions={
          <>
            <ApiSheet title="Webhooks pela API" snippets={webhookApiSnippets()} />
            <HeaderCreateAction endpoints={endpoints.data} creator={creator} />
          </>
        }
      />
      <LoadError error={endpoints.error} onRetry={() => endpoints.refetch()} />
      <WebhookSecretNotice revealed={secret} onDismiss={() => creation.reset()} />
      <WebhooksContent
        projectId={projectId}
        endpoints={endpoints.data}
        hasFailed={endpoints.isError}
        limit={MAX_ENDPOINTS}
        creator={creator}
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
