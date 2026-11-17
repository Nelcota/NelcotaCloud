import { afterEach, describe, expect, it, vi } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { AuthEvent, NelcotaClient, SessionStorageAdapter } from '../src/index'
import { FakeApi, sessionTokens } from './fake-api'

const STORAGE_KEY = 'nelcota-session'
const CREDENTIALS = { email: 'ana@example.com', password: 'correct horse battery' }

function clientWith(api: FakeApi, storage: SessionStorageAdapter): NelcotaClient {
  return createClient({
    url: 'https://api.test',
    publishableKey: 'nc_pk_test',
    storage,
    fetch: api.fetch,
  })
}

async function signedInClient(
  api: FakeApi,
  storage: SessionStorageAdapter,
): Promise<NelcotaClient> {
  api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens({ expiresIn: 1 }) })
  const client = clientWith(api, storage)
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
    const client = await signedInClient(api, memoryStorage())
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
})

describe('listeners', () => {
  it('keeps the login and the other listeners when one listener throws', async () => {
    const reportedErrors: unknown[] = []
    vi.stubGlobal('queueMicrotask', (task: () => void) => {
      try {
        task()
      } catch (error) {
        reportedErrors.push(error)
      }
    })
    const api = new FakeApi()
    api.reply('POST /auth/v1/login', { status: 200, body: sessionTokens() })
    const client = clientWith(api, memoryStorage())
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange(() => {
      throw new Error('broken listener')
    })
    client.auth.onAuthStateChange((event) => events.push(event))

    const result = await client.auth.signInWithPassword(CREDENTIALS)

    expect(result.kind).toBe('session')
    expect(events).toEqual(['SIGNED_IN'])
    expect(reportedErrors).toHaveLength(1)
  })
})

describe('other tabs', () => {
  it('follows a sign in and a sign out made in another tab', async () => {
    const storageListeners: ((event: Partial<StorageEvent>) => void)[] = []
    vi.stubGlobal(
      'addEventListener',
      (_type: string, listener: (event: Partial<StorageEvent>) => void) => {
        storageListeners.push(listener)
      },
    )
    const storage = memoryStorage()
    const api = new FakeApi()
    const client = clientWith(api, storage)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))
    await signedInClient(api, storage)
    const announce = (): void => {
      for (const listener of storageListeners) {
        listener({ key: STORAGE_KEY, storageArea: storage as Storage })
      }
    }

    announce()
    expect(client.auth.getSession()?.refreshToken).toBe('nc_rt_first')

    storage.removeItem(STORAGE_KEY)
    announce()
    expect(client.auth.getSession()).toBeNull()
    expect(events).toEqual(['SIGNED_IN', 'SIGNED_OUT'])
  })

  it('removes its storage listener and auth callbacks when disposed', async () => {
    const listeners = new Set<(event: Partial<StorageEvent>) => void>()
    vi.stubGlobal(
      'addEventListener',
      (_type: string, listener: (event: Partial<StorageEvent>) => void) => {
        listeners.add(listener)
      },
    )
    vi.stubGlobal(
      'removeEventListener',
      (_type: string, listener: (event: Partial<StorageEvent>) => void) => {
        listeners.delete(listener)
      },
    )

    const storage = memoryStorage()
    const api = new FakeApi()
    const client = clientWith(api, storage)
    const events: AuthEvent[] = []
    client.auth.onAuthStateChange((event) => events.push(event))

    expect(listeners.size).toBe(1)

    client.dispose()
    client.dispose()

    expect(listeners.size).toBe(0)
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + 60000,
        user: {
          id: 'id',
          email: 'ana@example.com',
          created_at: '2026-11-16T12:00:00Z',
          mfa_enabled: false,
        },
      }),
    )

    for (const listener of listeners) {
      listener({ key: STORAGE_KEY, storageArea: storage as Storage })
    }

    expect(client.auth.getSession()).toBeNull()
    expect(events).toEqual([])
  })
})
