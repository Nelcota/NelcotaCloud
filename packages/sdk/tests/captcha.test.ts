import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

describe('captcha', () => {
  it('reads the site key, or null when the project needs no captcha', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('GET /auth/v1/captcha', { status: 200, body: { site_key: '0x4AAA' } })

    expect(await client.auth.getCaptchaSiteKey()).toBe('0x4AAA')

    api.reply('GET /auth/v1/captcha', { status: 200, body: { site_key: null } })
    expect(await client.auth.getCaptchaSiteKey()).toBeNull()
  })

  it('sends the token with logins and emailed links, and nothing without one', async () => {
    const api = new FakeApi()
    const client = clientFor(api)
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    api.reply('POST /auth/v1/magic-link', { status: 202 })
    const credentials = { email: 'ana@example.com', password: 'secret' }

    await client.auth.signInWithPassword({ ...credentials, captchaToken: 'solved' })
    await client.auth.sendMagicLink({ email: 'ana@example.com' })

    expect(api.callsTo('POST /auth/v1/login')[0]?.body).toEqual({
      ...credentials,
      captcha_token: 'solved',
    })
    expect(api.callsTo('POST /auth/v1/magic-link')[0]?.body).toEqual({
      email: 'ana@example.com',
    })
  })
})
