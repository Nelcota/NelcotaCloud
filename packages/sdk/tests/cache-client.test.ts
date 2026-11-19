import { describe, expect, it, vi } from 'vitest'

import { createCacheClient } from '../src/index'

const URL = 'https://api.example.test'
const TOKEN = 'nc_cache_test'
const KEY = 'products:123'

describe('project cache', () => {
  it('uses the cache credential and sends JSON data with a TTL', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    fetch.mockResolvedValue(new Response(null, { status: 204 }))
    const cache = createCacheClient({ url: `${URL}/`, token: TOKEN, fetch })
    await cache.set(KEY, { available: true }, 60)
    await cache.delete(KEY)

    expect(fetch).toHaveBeenNthCalledWith(1, `${URL}/cache/v1/set`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ key: KEY, value: { available: true }, ttl_seconds: 60 }),
      redirect: 'error',
      signal: expect.any(AbortSignal),
    })
    expect(fetch.mock.calls[1]?.[0]).toBe(`${URL}/cache/v1/delete`)
  })

  it('distinguishes a miss, cached null and Valkey unavailability', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    fetch
      .mockResolvedValueOnce(Response.json({ value: null }))
      .mockResolvedValueOnce(
        Response.json({ error: 'cache_miss', message: 'missing entry' }, { status: 404 }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: 'cache_unavailable', message: 'unavailable' }, { status: 503 }),
      )
    const cache = createCacheClient({ url: URL, token: TOKEN, fetch })

    await expect(cache.get(KEY)).resolves.toEqual({ value: null })
    await expect(cache.get(KEY)).resolves.toBeNull()
    await expect(cache.get(KEY)).rejects.toMatchObject({ status: 503, code: 'cache_unavailable' })
  })

  it('rejects a malformed hit', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({}))
    const cache = createCacheClient({ url: URL, token: TOKEN, fetch })

    await expect(cache.get(KEY)).rejects.toThrow('invalid cache entry')
  })

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite numbers (%s) before sending',
    async (value) => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      const cache = createCacheClient({ url: URL, token: TOKEN, fetch })

      await expect(cache.set(KEY, value)).rejects.toThrow(TypeError)
      await expect(cache.set(KEY, { samples: [null, value] })).rejects.toThrow(TypeError)
      await expect(cache.set(KEY, null, value)).rejects.toThrow(TypeError)
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('requires a cache token and HTTPS away from loopback', () => {
    expect(() => createCacheClient({ url: URL, token: 'nc_sk_test' })).toThrow('cache credential')
    expect(() => createCacheClient({ url: 'http://api.example.test', token: TOKEN })).toThrow(
      'HTTPS',
    )
    expect(() => createCacheClient({ url: 'http://127.0.0.1:8080', token: TOKEN })).not.toThrow()
  })
})
