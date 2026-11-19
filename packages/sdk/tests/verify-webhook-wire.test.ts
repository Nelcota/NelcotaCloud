import { describe, expect, it } from 'vitest'

import { verifyWebhook } from '../src/index'
import { EVENT, SPEC_NOW, SPEC_SECRET, SPEC_TIMESTAMP, headers, sign } from './webhook-test-fixture'

describe('Standard Webhooks wire compatibility', () => {
  it('verifies a live delivery with the default clock and standard headers', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = await sign(EVENT, timestamp)
    const input = { headers: headers(signature, timestamp), secret: SPEC_SECRET }

    await expect(verifyWebhook({ ...input, payload: EVENT })).resolves.toMatchObject({
      type: 'user.created',
    })
    await expect(
      verifyWebhook({ ...input, payload: EVENT.replace('u1', 'u2') }),
    ).rejects.toMatchObject({
      code: 'invalid_signature',
    })
  })

  it('keeps the exact timestamp text in the signature with a custom clock', async () => {
    const timestamp = `0${SPEC_TIMESTAMP}`
    const signature = await sign(EVENT, timestamp)
    const input = { payload: EVENT, secret: SPEC_SECRET, now: SPEC_NOW }

    await expect(
      verifyWebhook({ ...input, headers: headers(signature, timestamp) }),
    ).resolves.toMatchObject({
      type: 'user.created',
    })
    await expect(verifyWebhook({ ...input, headers: headers(signature) })).rejects.toMatchObject({
      code: 'invalid_signature',
    })
  })
})
