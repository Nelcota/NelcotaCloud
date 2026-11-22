import { useNavigate } from '@tanstack/react-router'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { useDeleteWebhookEndpointMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { showFlash } from '@/shared/lib/flash-notice'

/** Deletes the endpoint whose page is open, then goes back to the list, which says so. */
export function useDeleteEndpoint(
  projectId: string,
  endpoint: WebhookEndpoint,
): () => Promise<void> {
  const remove = useDeleteWebhookEndpointMutation(projectId)
  const navigate = useNavigate()

  return async function deleteEndpoint(): Promise<void> {
    await remove.mutateAsync(endpoint.id)
    showFlash(`Endpoint excluído: ${endpoint.url}`)
    await navigate({ to: '/projects/$projectId/webhooks', params: { projectId } })
  }
}
