import { expectedSignature, hasMatchingSignature, secretKey } from './webhook-signature'
import { WebhookVerificationError } from './webhook-verification-error'

/** Requests older or newer than this are refused, so a captured one cannot be replayed later. */
const DEFAULT_TOLERANCE_SECONDS = 5 * 60
const MILLISECONDS_PER_SECOND = 1000

/** What every webhook carries. `data` depends on `type` (e.g. `data.user` for `user.*`). */
export type WebhookEvent = {
  /** E.g. `user.created`, `user.updated`, `user.deleted`, `session.revoked`. */
  type: string
  /** When the change happened (RFC 3339). */
  timestamp: string
  data: Record<string, unknown>
}

/** The three `webhook-*` headers, as a `Headers` object or a plain record (Node, Express). */
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>

export type VerifyWebhookOptions = {
  /** The raw request body, exactly as received: parsing and serializing it again breaks it. */
  payload: string
  headers: WebhookHeaders
  /** The endpoint's `whsec_…` secret. Keep it on your server only. */
  secret: string
  /** Defaults to 5 minutes. */
  toleranceSeconds?: number
  /** A custom clock (tests). */
  now?: () => number
}

/**
 * Checks that a webhook request came from NelcotaCloud (Standard Webhooks signature) and is
 * recent, then returns the event. Throws `WebhookVerificationError` otherwise.
 *
 * The same event can arrive more than once (retries): deduplicate by `webhook-id`.
 */
export async function verifyWebhook(options: VerifyWebhookOptions): Promise<WebhookEvent> {
  const id = header(options.headers, 'webhook-id')
  const timestamp = header(options.headers, 'webhook-timestamp')
  const signature = header(options.headers, 'webhook-signature')

  if (id === null || timestamp === null || signature === null) {
    throw new WebhookVerificationError('missing_headers', 'Missing webhook-* headers.')
  }

  checkTimestamp(timestamp, options)
  const key = secretKey(options.secret)
  const expected = await expectedSignature(key, `${id}.${timestamp}.${options.payload}`)

  if (hasMatchingSignature(signature, expected) === false) {
    throw new WebhookVerificationError('invalid_signature', 'The webhook signature does not match.')
  }

  return parseEvent(options.payload)
}

function header(headers: WebhookHeaders, name: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(name)
  }

  const value = headers[name] ?? headers[name.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function checkTimestamp(timestamp: string, options: VerifyWebhookOptions): void {
  const sentAt = Number(timestamp)
  const now = (options.now ?? Date.now)() / MILLISECONDS_PER_SECOND
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS

  if (Number.isFinite(sentAt) === false || Math.abs(now - sentAt) > tolerance) {
    throw new WebhookVerificationError(
      'timestamp_out_of_range',
      'The webhook is too old or too new.',
    )
  }
}

function parseEvent(payload: string): WebhookEvent {
  const parsed: unknown = JSON.parse(payload)

  if (isWebhookEvent(parsed) === false) {
    throw new WebhookVerificationError('invalid_payload', 'The webhook body is not an event.')
  }

  return parsed
}

function isWebhookEvent(value: unknown): value is WebhookEvent {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const event = value as Record<string, unknown>

  return (
    typeof event.type === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.data === 'object' &&
    event.data !== null
  )
}
