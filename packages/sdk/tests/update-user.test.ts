import { describe, expect, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { AuthEvent, NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

function clientFor(api: FakeApi): NelcotaClient {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
}

async function signedIn(api: FakeApi): Promise<NelcotaClient> {
  api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
  const client = clientFor(api)
  await client.auth.signInWithPassword({ email: 'ana@example.com', password: 'secret' })

  return client
}

function userWithMetadata(): object {
  const tokens = sessionTokens() as { user: object }

  return { ...tokens.user, user_metadata: { name: 'Ana' } }
}

describe('auth.updateUser', () => {
  it('replaces the user metadata and keeps the session user current', async () => {
    const api = new FakeApi()
    const client = await signedIn(api)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))
    api.reply('PATCH /auth/v1/user', { status: 200, body: userWithMetadata() })

    const user = await client.auth.updateUser({ name: 'Ana' })

    const call = api.callsTo('PATCH /auth/v1/user')[0]
    expect(call?.body).toEqual({ user_metadata: { name: 'Ana' } })
    expect(call?.headers.authorization).toBe('Bearer access-token')
    expect(user.user_metadata).toEqual({ name: 'Ana' })
    expect(client.auth.getSession()?.user.user_metadata).toEqual({ name: 'Ana' })
    expect(events).toEqual(['USER_UPDATED'])
  })

  it('fails without a session', async () => {
    const client = clientFor(new FakeApi())

    await expect(client.auth.updateUser({})).rejects.toMatchObject({
      code: 'not_authenticated',
    })
  })
})
