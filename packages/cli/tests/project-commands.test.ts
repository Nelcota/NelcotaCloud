import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { runCli } from '../src/cli/run-cli'
import { temporaryFolder, testContext } from './support/test-context'
import type { FakeReply } from './support/test-context'

const ENVIRONMENT = { NELCOTA_SECRET_KEY: 'nc_sk_test', NELCOTA_API_URL: 'https://api.example.com' }
const CONNECTION = {
  enabled: true,
  host: 'localhost',
  port: 54322,
  database: 'tenant_acme',
  user: 'acme',
  ssl_mode: 'disable',
  has_password: false,
}

const noServer = (): FakeReply => ({ status: 500 })

const typesReply = (): FakeReply => ({
  status: 200,
  body: { typescript: 'export type Database = {}' },
})

const reset = (): FakeReply => ({
  status: 200,
  body: { password: 'p', connection_string: 'postgresql://acme:p@localhost:54322/tenant_acme' },
})

const refusedReset = (): FakeReply => ({
  status: 409,
  body: { error: 'direct_connection_disabled', message: 'x' },
})

describe('init', () => {
  it('creates the migrations folder and ignores .nelcota/ once', async () => {
    const root = await temporaryFolder()
    await mkdir(join(root, '.git'))
    await writeFile(join(root, '.gitignore'), 'node_modules')
    const context = testContext(root, noServer)

    expect(await runCli(['init'], context)).toBe(0)
    expect(await runCli(['init'], context)).toBe(0)
    expect(await readdir(join(root, 'nelcota', 'migrations'))).toEqual(['.gitkeep'])
    expect(await readFile(join(root, '.gitignore'), 'utf8')).toBe('node_modules\n.nelcota/\n')
    expect(context.printed.at(-1)).toBe('.nelcota/ já estava em .gitignore')
  })

  it('creates a .gitignore when the repository has none', async () => {
    const root = await temporaryFolder()
    await mkdir(join(root, '.git'))

    expect(await runCli(['init'], testContext(root, noServer))).toBe(0)
    expect(await readFile(join(root, '.gitignore'), 'utf8')).toBe('.nelcota/\n')
  })
})

describe('gen types', () => {
  it('prints the types or writes them, creating folders', async () => {
    const root = await temporaryFolder()
    const context = testContext(root, typesReply, { environment: ENVIRONMENT })

    expect(await runCli(['gen', 'types'], context)).toBe(0)
    expect(context.printed).toEqual(['export type Database = {}'])
    expect(await runCli(['gen', 'types', '--output', 'src/types/db.ts'], context)).toBe(0)
    expect(await readFile(join(root, 'src', 'types', 'db.ts'), 'utf8')).toBe(
      'export type Database = {}\n',
    )
    expect(context.requests[0]?.url).toBe('https://api.example.com/database/v1/types')
  })
})

describe('db url', () => {
  it('prints the masked URL and how to get a password', async () => {
    const context = testContext('/', () => ({ status: 200, body: CONNECTION }), {
      environment: ENVIRONMENT,
    })

    expect(await runCli(['db', 'url'], context)).toBe(0)
    expect(context.printed).toEqual([
      'postgresql://acme:[SENHA]@localhost:54322/tenant_acme?sslmode=disable',
    ])
    expect(context.notes[0]).toContain('nelcota db reset-password')
  })

  it('explains when direct connections are disabled', async () => {
    const disabled = { ...CONNECTION, enabled: false, host: null, port: null }
    const context = testContext('/', () => ({ status: 200, body: disabled }), {
      environment: ENVIRONMENT,
    })

    expect(await runCli(['db', 'url'], context)).toBe(1)
    expect(context.notes).toEqual([
      'As conexões diretas ao Postgres estão desativadas neste servidor.',
    ])
  })
})

describe('db reset-password', () => {
  it('refuses without a terminal and without --yes', async () => {
    const context = testContext('/', reset, { environment: ENVIRONMENT })

    await expect(runCli(['db', 'reset-password'], context)).rejects.toThrow('--yes')
    expect(context.requests).toEqual([])
  })

  it('does nothing when the person answers no', async () => {
    const context = testContext('/', reset, { environment: ENVIRONMENT, isInteractive: () => true })

    expect(await runCli(['db', 'reset-password'], context)).toBe(1)
    expect(context.requests).toEqual([])
  })

  it('prints the new connection string once with --yes', async () => {
    const context = testContext('/', reset, { environment: ENVIRONMENT })

    expect(await runCli(['db', 'reset-password', '--yes'], context)).toBe(0)
    expect(context.printed).toEqual(['postgresql://acme:p@localhost:54322/tenant_acme'])
    expect(context.requests[0]?.method).toBe('POST')
  })

  it('explains a server without direct connections', async () => {
    const context = testContext('/', refusedReset, { environment: ENVIRONMENT })

    await expect(runCli(['db', 'reset-password', '--yes'], context)).rejects.toThrow('desativadas')
  })
})
