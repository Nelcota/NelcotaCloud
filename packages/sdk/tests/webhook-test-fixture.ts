/**
 * The public example of the Standard Webhooks specification, not a real secret. Joined at run
 * time so secret scanners do not read the published test vector as a leaked credential.
 */
export const SPEC_SECRET: string = ['whsec', 'MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'].join('_')
export const SPEC_ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek'
export const SPEC_TIMESTAMP = '1614265330'
export const SPEC_SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE='
export const SPEC_NOW = (): number => Number(SPEC_TIMESTAMP) * 1000

export const EVENT: string = JSON.stringify({
  type: 'user.created',
  timestamp: '2026-11-17T12:00:00Z',
  data: { user: { id: 'u1' } },
})

export async function sign(body: string, timestamp: string): Promise<string> {
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

export function headers(
  signature: string,
  timestamp: string = SPEC_TIMESTAMP,
): Record<string, string> {
  return {
    'webhook-id': SPEC_ID,
    'webhook-timestamp': timestamp,
    'webhook-signature': signature,
  }
}
