import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { runCli } from '../src/cli/run-cli'
import { temporaryFolder, testContext } from './support/test-context'
import type { FakeReply, RecordedRequest } from './support/test-context'

const ENVIRONMENT = { NELCOTA_SECRET_KEY: 'nc_sk_test', NELCOTA_API_URL: 'https://api.example.com' }

let root = ''
let migrations = ''

beforeEach(async () => {
  root = await temporaryFolder()
  migrations = join(root, 'nelcota', 'migrations')
  await mkdir(migrations, { recursive: true })
})

function history(applied: readonly [number, string][]): FakeReply {
  const entries = applied.map(([version, name]) => ({
    version,
    name,
    applied_at: '2026-01-01T00:00:00Z',
    actor_account_id: null,
  }))

  return { status: 200, body: { migrations: entries, next_before: null } }
}

function server(applied: readonly [number, string][], refuse = '') {
  return (request: RecordedRequest): FakeReply => {
    if (request.method === 'GET') {
      return history(applied)
    }

    if (JSON.stringify(request.body).includes(refuse) && refuse !== '') {
      return { status: 400, body: { error: 'sql_error', message: 'syntax error' } }
    }

    return { status: 201, body: {} }
  }
}

describe('migrations new', () => {
  it('writes a file named after the UTC time from a subfolder', async () => {
    const cwd = join(root, 'src')
    await mkdir(cwd)
    const context = testContext(cwd, server([]))

    expect(await runCli(['migrations', 'new', 'create_posts'], context)).toBe(0)
    expect(await readdir(migrations)).toEqual(['20261122134507_create_posts.sql'])
    expect(context.printed).toEqual([
      join('..', 'nelcota', 'migrations', '20261122134507_create_posts.sql'),
    ])
  })

  it('refuses a version that already exists locally', async () => {
    await writeFile(join(migrations, '20261122134507_other.sql'), 'select 1;')

    await expect(
      runCli(['migrations', 'new', 'again'], testContext(root, server([]))),
    ).rejects.toThrow('versão 20261122134507')
  })
})

describe('migrations push', () => {
  beforeEach(async () => {
    await writeFile(join(migrations, '1_a.sql'), 'create table a ();\r\n')
    await writeFile(join(migrations, '3_c.sql'), 'create table c ();')
    await writeFile(join(migrations, '2_b.sql'), 'create table b ();')
  })

  it('applies pending files in order with their exact contents', async () => {
    const context = testContext(root, server([[1, 'a']]), { environment: ENVIRONMENT })

    expect(await runCli(['migrations', 'push'], context)).toBe(0)
    const posts = context.requests.filter((request) => request.method === 'POST')
    expect(posts.map((request) => request.body)).toEqual([
      { version: 2, name: 'b', sql: 'create table b ();' },
      { version: 3, name: 'c', sql: 'create table c ();' },
    ])
  })

  it('sends nothing with --dry-run', async () => {
    const context = testContext(root, server([]), { environment: ENVIRONMENT })

    expect(await runCli(['migrations', 'push', '--dry-run'], context)).toBe(0)
    expect(context.requests.every((request) => request.method === 'GET')).toBe(true)
    expect(context.printed).toContain('  1_a.sql')
  })

  it('refuses before applying anything when the server has another history', async () => {
    const context = testContext(root, server([[2, 'renamed']]), { environment: ENVIRONMENT })

    expect(await runCli(['migrations', 'push'], context)).toBe(1)
    expect(context.requests.every((request) => request.method === 'GET')).toBe(true)
    expect(context.notes.join('\n')).toContain('Nada foi aplicado')
  })

  it('stops at the first refusal and prints it', async () => {
    const context = testContext(root, server([], 'table b'), { environment: ENVIRONMENT })

    expect(await runCli(['migrations', 'push'], context)).toBe(1)
    expect(context.requests.filter((request) => request.method === 'POST')).toHaveLength(2)
    expect(context.notes[0]).toBe('Falhou em 2_b.sql: sql_error (400): syntax error')
  })

  it('lists local and remote versions', async () => {
    const context = testContext(
      root,
      server([
        [1, 'a'],
        [9, 'z'],
      ]),
      { environment: ENVIRONMENT },
    )

    expect(await runCli(['migrations', 'list'], context)).toBe(0)
    expect(context.printed).toEqual([
      '1_a  aplicada',
      '2_b  pendente',
      '3_c  pendente',
      '9_z  só no servidor',
    ])
  })

  it('reads the local project with --local', async () => {
    const devFolder = join(root, '.nelcota', 'dev')
    await mkdir(devFolder, { recursive: true })
    const project = {
      tenant_id: 't',
      slug: 's',
      publishable_key: 'nc_pk_x',
      secret_key: 'nc_sk_local',
      api_url: 'http://localhost:54320',
    }
    await writeFile(join(devFolder, 'project.json'), JSON.stringify(project))
    const context = testContext(
      root,
      server([
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ]),
    )

    expect(await runCli(['migrations', 'push', '--local'], context)).toBe(0)
    expect(context.requests[0]?.url).toBe('http://localhost:54320/database/v1/migrations')
    expect(context.requests[0]?.headers.apikey).toBe('nc_sk_local')
    expect(await readFile(join(migrations, '1_a.sql'), 'utf8')).toBe('create table a ();\r\n')
  })
})
