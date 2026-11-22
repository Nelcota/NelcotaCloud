import type { components } from '@/shared/api/api-schema'

export type WebhookEndpoint = components['schemas']['WebhookEndpointView']

/** The last secret issued in this visit, so the secret tab can say until when the old one signs. */
export type LastRotation = { endpointId: string; rotatedAt: number }

export type SecretRotation = {
  /** False while another secret is on screen or being issued: one shown at a time. */
  canRotate: boolean
  isRotating: boolean
  lastRotation: LastRotation | null
  onRotate: (endpointId: string) => Promise<void>
}

/** What every part of the selected endpoint's panel needs. */
export type EndpointPanel = {
  projectId: string
  endpoint: WebhookEndpoint
  rotation: SecretRotation
}
