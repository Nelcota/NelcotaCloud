import { Webhook, type WebhookUnbrandedRequiredHeaders } from 'standardwebhooks'

import { matchesRawSignature, secretKey } from './webhook-signature'
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
  const signedHeaders = {
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': signature,
  }
  await verifySignature(options, signedHeaders, key)

  return parseEvent(options.payload)
}

async function verifySignature(
  options: VerifyWebhookOptions,
  headers: WebhookUnbrandedRequiredHeaders,
  key: Uint8Array<ArrayBuffer>,
): Promise<void> {
  const timestamp = headers['webhook-timestamp']
  const sentAt = Number(timestamp)

  if (
    options.now === undefined &&
    options.toleranceSeconds === undefined &&
    Number.isSafeInteger(sentAt) &&
    String(sentAt) === timestamp
  ) {
    verifyStandardSignature(options.payload, headers, key)
    return
  }

  // The upstream verifier fixes the clock and tolerance and canonicalizes the timestamp.
  // These callers need the exact signed header bytes and the SDK's configurable clock.
  const content = `${headers['webhook-id']}.${timestamp}.${options.payload}`

  if ((await matchesRawSignature(key, content, headers['webhook-signature'])) === false) {
    throw signatureMismatch()
  }
}

function verifyStandardSignature(
  payload: string,
  headers: WebhookUnbrandedRequiredHeaders,
  key: Uint8Array<ArrayBuffer>,
): void {
  try {
    new Webhook(key, { format: 'raw' }).verify(payload, headers, { jsonParse: false })
  } catch {
    throw signatureMismatch()
  }
}

function signatureMismatch(): WebhookVerificationError {
  return new WebhookVerificationError('invalid_signature', 'The webhook signature does not match.')
}

function header(headers: WebhookHeaders, name: string): string | null {
  if (isHeaders(headers)) {
    return headers.get(name)
  }

  const value = headers[name] ?? headerIgnoringCase(headers, name)

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

/** Plain records keep the case the sender used (`Webhook-Id`); header names ignore case. */
function headerIgnoringCase(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | string[] | undefined {
  const lowerName = name.toLowerCase()
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === lowerName)

  if (key === undefined) {
    return undefined
  }

  return headers[key]
}

function checkTimestamp(timestamp: string, options: VerifyWebhookOptions): void {
  const sentAt = Number(timestamp)
  const now = (options.now ?? Date.now)() / MILLISECONDS_PER_SECOND
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS

  // A NaN or negative tolerance would accept every timestamp, or none.
  if (Number.isFinite(tolerance) === false || tolerance < 0) {
    throw new RangeError('toleranceSeconds must be a finite number of seconds, 0 or more.')
  }

  if (
    timestamp.trim() === '' ||
    Number.isFinite(sentAt) === false ||
    Math.abs(now - sentAt) > tolerance
  ) {
    throw new WebhookVerificationError(
      'timestamp_out_of_range',
      'The webhook is too old or too new.',
    )
  }
}

function parseEvent(payload: string): WebhookEvent {
  const parsed = parseJson(payload)

  if (isWebhookEvent(parsed) === false) {
    throw new WebhookVerificationError('invalid_payload', 'The webhook body is not an event.')
  }

  return parsed
}

/** Older runtimes have no global `Headers`; plain records work everywhere. */
function isHeaders(headers: WebhookHeaders): headers is Headers {
  return typeof Headers !== 'undefined' && headers instanceof Headers
}

function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    throw new WebhookVerificationError('invalid_payload', 'The webhook body is not JSON.')
  }
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
