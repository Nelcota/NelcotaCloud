import { useState } from 'react'

import type {
  LastRotation,
  SecretRotation,
} from '@/modules/webhooks/components/endpoint-panel-types'
import { useRotateWebhookSecretMutation } from '@/modules/webhooks/queries/use-webhook-endpoints'

type RevealedSecret = { url: string; secret: string }

export type SecretRotationState = {
  rotation: SecretRotation
  /** The secret just issued, shown once; `undefined` once stored or before any rotation. */
  revealed: RevealedSecret | undefined
  dismiss: () => void
}

/** Issuing a new signing secret: one on screen at a time, and when the old one stops signing. */
export function useSecretRotation(projectId: string, url: string): SecretRotationState {
  const mutation = useRotateWebhookSecretMutation(projectId)
  const [lastRotation, setLastRotation] = useState<LastRotation | null>(null)
  const issued = mutation.data?.secret

  async function rotate(endpointId: string): Promise<void> {
    await mutation.mutateAsync(endpointId)
    setLastRotation({ endpointId, rotatedAt: Date.now() })
  }

  return {
    rotation: {
      canRotate: issued === undefined && mutation.isPending === false,
      isRotating: mutation.isPending,
      lastRotation,
      onRotate: rotate,
    },
    revealed: revealedOf(url, issued),
    dismiss: () => mutation.reset(),
  }
}

function revealedOf(url: string, secret: string | undefined): RevealedSecret | undefined {
  if (secret === undefined) {
    return undefined
  }

  return { url, secret }
}
