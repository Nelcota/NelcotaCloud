import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { createWebhookEndpoint } from '@/modules/webhooks/api/create-webhook-endpoint'
import { rotateWebhookSecret } from '@/modules/webhooks/api/rotate-webhook-secret'
import { webhookEndpointsKey } from '@/modules/webhooks/queries/use-webhook-endpoints'
import { queueHealthKey } from '@/modules/webhooks/queries/use-webhook-queue-health'
import type { components } from '@/shared/api/api-schema'

type EndpointBody = components['schemas']['WebhookEndpointBody']
type WithSecret = components['schemas']['WebhookEndpointWithSecret']
type Issuance = { kind: 'create'; body: EndpointBody } | { kind: 'rotate'; endpointId: string }
type Phase = 'available' | 'issuing' | 'awaiting-confirmation'

type WebhookSecretIssuance = {
  create: (body: EndpointBody) => Promise<void>
  rotate: (endpointId: string) => Promise<void>
  revealed: WithSecret | undefined
  isIssuing: boolean
  dismiss: () => void
}

export function useWebhookSecretIssuance(projectId: string): WebhookSecretIssuance {
  const queryClient = useQueryClient()
  const phase = useRef<Phase>('available')
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (issuance: Issuance) => issueSecret(projectId, issuance),
    onSuccess: (_secret, issuance) => {
      if (issuance.kind === 'create') {
        // The one-time response can be shown while the list reloads.
        void queryClient.invalidateQueries({ queryKey: webhookEndpointsKey(projectId) })
        void queryClient.invalidateQueries({ queryKey: queueHealthKey(projectId) })
      }
    },
  })

  async function issue(issuance: Issuance): Promise<void> {
    if (phase.current !== 'available') {
      throw new Error('A webhook secret is already being issued or awaits confirmation.')
    }

    // Event handlers can run before React paints the disabled controls.
    phase.current = 'issuing'

    try {
      await mutation.mutateAsync(issuance)
      phase.current = 'awaiting-confirmation'
    } catch (error) {
      phase.current = 'available'
      throw error
    }
  }

  function dismiss(): void {
    if (phase.current !== 'awaiting-confirmation') {
      return
    }

    mutation.reset()
    phase.current = 'available'
  }

  return {
    create: (body) => issue({ kind: 'create', body }),
    rotate: (endpointId) => issue({ kind: 'rotate', endpointId }),
    revealed: mutation.data,
    isIssuing: mutation.isPending,
    dismiss,
  }
}

function issueSecret(projectId: string, issuance: Issuance): Promise<WithSecret> {
  if (issuance.kind === 'create') {
    return createWebhookEndpoint(projectId, issuance.body)
  }

  return rotateWebhookSecret(projectId, issuance.endpointId)
}
