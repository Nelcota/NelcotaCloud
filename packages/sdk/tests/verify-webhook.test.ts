import { describe, expect, it } from 'vitest'

import { WebhookVerificationError, verifyWebhook } from '../src/index'

/** The example of the Standard Webhooks specification. */
const SPEC_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const SPEC_ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek'
const SPEC_TIMESTAMP = '1614265330'
const SPEC_SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE='
const SPEC_NOW = () => Number(SPEC_TIMESTAMP) * 1000

const EVENT = JSON.stringify({
  type: 'user.created',
  timestamp: '2026-11-17T12:00:00Z',
  data: { user: { id: 'u1' } },
})

async function sign(body: string, timestamp: string): Promise<string> {
  const key = Uint8Array.from(atob(SPEC_SECRET.slice('whsec_'.length)), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const content = new TextEncoder().encode(`${SPEC_ID}.${timestamp}.${body}`)
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, content)

  return `v1,${btoa(String.fromCharCode(...new Uint8Array(digest)))}`
}

function headers(signature: string, timestamp = SPEC_TIMESTAMP): Record<string, string> {
  return {
    'webhook-id': SPEC_ID,
    'webhook-timestamp': timestamp,
    'webhook-signature': signature,
  }
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  )

  if (error instanceof WebhookVerificationError) {
    return error.code
  }

  return 'no WebhookVerificationError'
}

describe('verifyWebhook', () => {
  it('accepts the specification example signature, then refuses its body as an event', async () => {
    const payload = '{"test": 2432232314}'
    const verify = verifyWebhook({
      payload,
      headers: headers(SPEC_SIGNATURE),
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })

    expect(await codeOf(verify)).toBe('invalid_payload')
  })

  it('returns the event when one of the signatures matches', async () => {
    const valid = await sign(EVENT, SPEC_TIMESTAMP)
    const rotation = `v1,c29tZXRoaW5nIGVsc2U= ${valid}`
    const request = new Headers(headers(rotation))

    const event = await verifyWebhook({
      payload: EVENT,
      headers: request,
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })

    expect(event.type).toBe('user.created')
    expect(event.data).toEqual({ user: { id: 'u1' } })
  })

  it('refuses a changed body', async () => {
    const signature = await sign(EVENT, SPEC_TIMESTAMP)
    const tampered = EVENT.replace('u1', 'u2')
    const verify = verifyWebhook({
      payload: tampered,
      headers: headers(signature),
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })

    expect(await codeOf(verify)).toBe('invalid_signature')
  })

  it('refuses requests outside the time tolerance', async () => {
    const old = String(Number(SPEC_TIMESTAMP) - 600)
    const signature = await sign(EVENT, old)
    const verify = verifyWebhook({
      payload: EVENT,
      headers: headers(signature, old),
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })

    expect(await codeOf(verify)).toBe('timestamp_out_of_range')
  })

  it('refuses a signed body that is not JSON and an empty secret with its own errors', async () => {
    const body = 'not json'
    const signature = await sign(body, SPEC_TIMESTAMP)
    const notJson = verifyWebhook({
      payload: body,
      headers: headers(signature),
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })
    expect(await codeOf(notJson)).toBe('invalid_payload')

    // Created only now, so its rejection is awaited as soon as it exists.
    const emptySecret = verifyWebhook({
      payload: EVENT,
      headers: headers(signature),
      secret: 'whsec_',
      now: SPEC_NOW,
    })
    expect(await codeOf(emptySecret)).toBe('invalid_secret')
  })

  it('refuses requests without the headers', async () => {
    const verify = verifyWebhook({
      payload: EVENT,
      headers: {},
      secret: SPEC_SECRET,
      now: SPEC_NOW,
    })

    expect(await codeOf(verify)).toBe('missing_headers')
  })
})
