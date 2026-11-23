import { afterEach, describe, expect, it, vi } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { AuthEvent, NelcotaClient } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const CREDENTIALS = { email: 'ana@example.com', password: 'correct horse battery' }

async function signedInClient(api: FakeApi, expiresIn: number): Promise<NelcotaClient> {
  api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens({ expiresIn }) })
  const client = createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage: memoryStorage(),
    fetch: api.fetch,
  })
  await client.auth.signInWithPassword(CREDENTIALS)

  return client
}

/** A promise the test settles by hand. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let settle: (() => void) | undefined
  const promise = new Promise<void>((resolve) => {
    settle = resolve
  })

  return { promise, resolve: () => settle?.() }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a refresh in flight', () => {
  it('does not bring the session back after a sign out', async () => {
    const api = new FakeApi()
    const refreshAnswer = deferred()
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_second' }),
      delay: refreshAnswer.promise,
    })
    api.reply('POST /auth/v1/logout', { status: 204 })
    const client = await signedInClient(api, 1)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))

    const tokenRequest = client.auth.getAccessToken()
    await vi.waitFor(() => expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(1))
    await client.auth.signOut()
    refreshAnswer.resolve()

    await expect(tokenRequest).rejects.toMatchObject({ code: 'not_authenticated' })
    expect(client.auth.getSession()).toBeNull()
    expect(events).toEqual(['SIGNED_OUT'])
  })

  it('deduplicates refreshes within the current sign-in while an older refresh finishes', async () => {
    vi.stubGlobal('navigator', {})
    const api = new FakeApi()
    const oldAnswer = deferred()
    const currentAnswer = deferred()
    const client = await signedInClient(api, 1)
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_old_renewed' }),
      delay: oldAnswer.promise,
    })

    const stale = expect(client.auth.getAccessToken()).rejects.toMatchObject({
      code: 'not_authenticated',
    })
    await vi.waitFor(() => expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(1))
    api.reply('POST /auth/v1/login', {
      status: 200,
      body: sessionTokens({ expiresIn: 1, refreshToken: 'nc_rt_current' }),
    })
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_current_renewed' }),
      delay: currentAnswer.promise,
    })
    await client.auth.signInWithPassword(CREDENTIALS)

    const current = client.auth.refreshSession()
    await vi.waitFor(() => expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(2))
    oldAnswer.resolve()
    await stale

    expect(client.auth.refreshSession()).toBe(current)
    currentAnswer.resolve()
    await expect(current).resolves.toMatchObject({ refreshToken: 'nc_rt_current_renewed' })
  })

  it('keeps the rotated token and a profile edit made while refreshing', async () => {
    const api = new FakeApi()
    const answer = deferred()
    const client = await signedInClient(api, 900)
    const user = client.auth.getSession()?.user
    api.reply('PATCH /auth/v1/user', {
      status: 200,
      body: { ...user, user_metadata: { name: 'Ana' } },
    })
    api.reply('POST /auth/v1/refresh', {
      status: 200,
      body: sessionTokens({ refreshToken: 'nc_rt_rotated' }),
      delay: answer.promise,
    })

    const refreshing = client.auth.refreshSession()
    await vi.waitFor(() => expect(api.callsTo('POST /auth/v1/refresh')).toHaveLength(1))
    await client.auth.updateUser({ name: 'Ana' })
    answer.resolve()
    await refreshing

    expect(client.auth.getSession()).toMatchObject({
      refreshToken: 'nc_rt_rotated',
      user: { user_metadata: { name: 'Ana' } },
    })
  })
})
