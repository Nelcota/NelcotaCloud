import { describe, expect, it } from 'vitest'

import { NelcotaApi } from '../src/api/api-client'
import { errorOf } from '../src/api/http-json'
import { CliError } from '../src/cli/cli-error'
import { readRemoteMigrations } from '../src/migrations/remote-migrations'
import { testContext } from './support/test-context'

const TARGET = { apiUrl: 'https://api.example.com', secretKey: 'nc_sk_test' }

function migration(version: number): Record<string, unknown> {
  return {
    version,
    name: `m${version}`,
    applied_at: '2026-01-01T00:00:00Z',
    actor_account_id: null,
  }
}

describe('readRemoteMigrations', () => {
  it('follows next_before until the oldest page, with the secret key', async () => {
    const context = testContext('/', (request) => {
      if (request.url.endsWith('?before=2')) {
        return { status: 200, body: { migrations: [migration(1)], next_before: null } }
      }

      return { status: 200, body: { migrations: [migration(3), migration(2)], next_before: 2 } }
    })
    const migrations = await readRemoteMigrations(new NelcotaApi(TARGET, context.fetch))

    expect(migrations.map((entry) => entry.version)).toEqual([3, 2, 1])
    expect(context.requests.map((request) => request.url)).toEqual([
      'https://api.example.com/database/v1/migrations',
      'https://api.example.com/database/v1/migrations?before=2',
    ])
    expect(context.requests[0]?.headers.apikey).toBe('nc_sk_test')
  })

  it('stops when a page does not move back in time', async () => {
    const context = testContext('/', () => ({
      status: 200,
      body: { migrations: [migration(3)], next_before: 3 },
    }))

    await expect(readRemoteMigrations(new NelcotaApi(TARGET, context.fetch))).rejects.toThrow(
      CliError,
    )
  })

  it('refuses a response in another shape', async () => {
    const context = testContext('/', () => ({ status: 200, body: { items: [] } }))

    await expect(readRemoteMigrations(new NelcotaApi(TARGET, context.fetch))).rejects.toThrow(
      'campo migrations',
    )
  })
})

describe('errorOf', () => {
  it('reads the error body under error or code', () => {
    expect(errorOf(409, { error: 'migration_mismatch', message: 'm' })).toMatchObject({
      status: 409,
      code: 'migration_mismatch',
      message: 'm',
    })
    expect(errorOf(400, { code: 'sql_error', message: 'syntax' }).code).toBe('sql_error')
  })

  it('falls back to the status for bodies without a message', () => {
    expect(errorOf(502, 'Bad Gateway')).toMatchObject({ code: 'unknown_error', status: 502 })
  })
})

describe('sendJson', () => {
  it('turns a dead server into a readable error', async () => {
    const context = testContext('/', () => ({ status: 200 }), {
      fetch: async () => {
        throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED') })
      },
    })
    const api = new NelcotaApi(TARGET, context.fetch)

    await expect(api.get({ path: '/health' })).rejects.toThrow(
      'Não foi possível falar com a API em https://api.example.com (connect ECONNREFUSED).',
    )
  })
})
