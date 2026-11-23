import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { runCli } from '../src/cli/run-cli'
import { DOCKER_MISSING_MESSAGE } from '../src/dev/docker-runner'
import { CliError } from '../src/cli/cli-error'
import { temporaryFolder, testContext } from './support/test-context'
import type { FakeReply, RecordedRequest } from './support/test-context'

const CREATED = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  slug: 'meu_app',
  publishable_key: 'nc_pk_local',
  secret_key: 'nc_sk_local',
}

let root = ''

beforeEach(async () => {
  const parent = await temporaryFolder()
  root = join(parent, 'Meu App')
  await mkdir(join(root, 'nelcota'), { recursive: true })
})

function localApi(request: RecordedRequest): FakeReply {
  if (request.url.endsWith('/health')) {
    return { status: 200 }
  }

  return { status: 201, body: CREATED }
}

describe('dev start', () => {
  it('writes the stack, creates the project once and keeps the secrets', async () => {
    const context = testContext(root, localApi)

    expect(await runCli(['dev', 'start'], context)).toBe(0)
    const envFile = await readFile(join(root, '.nelcota', 'dev', '.env'), 'utf8')
    expect(await runCli(['dev', 'start'], context)).toBe(0)

    const creations = context.requests.filter((request) =>
      request.url.endsWith('/admin/v1/tenants'),
    )
    expect(creations).toHaveLength(1)
    expect(creations[0]?.body).toEqual({
      slug: 'meu_app',
      name: 'Meu App',
      site_url: 'http://localhost:5173',
    })
    expect(creations[0]?.headers['x-admin-token']).toMatch(/^[0-9a-f]{64}$/)
    expect(await readFile(join(root, '.nelcota', 'dev', '.env'), 'utf8')).toBe(envFile)
    expect(envFile).toContain('COMPOSE_PROJECT_NAME=nelcota-meu-app')
    const project = JSON.parse(
      await readFile(join(root, '.nelcota', 'dev', 'project.json'), 'utf8'),
    )
    expect(project).toEqual({ ...CREATED, api_url: 'http://localhost:54320' })
    expect(context.printed).toContain('Chave publicável:   nc_pk_local')
    expect(await readFile(join(root, '.gitignore'), 'utf8')).toContain('.nelcota/')
  })

  it('runs docker compose up in the dev folder', async () => {
    const context = testContext(root, localApi)

    await runCli(['dev', 'start', '--slug', 'acme', '--site-url', 'http://localhost:3000'], context)

    const up = context.dockerRuns.find((run) => run.args.includes('up'))
    expect(up?.cwd).toBe(join(root, '.nelcota', 'dev'))
    expect(up?.args.slice(-2)).toEqual(['up', '-d'])
    expect(context.requests.at(-1)?.body).toMatchObject({
      slug: 'acme',
      site_url: 'http://localhost:3000',
    })
  })

  it('reports a missing Docker in Portuguese', async () => {
    const context = testContext(root, localApi, {
      docker: async () => {
        throw new CliError(DOCKER_MISSING_MESSAGE)
      },
    })

    await expect(runCli(['dev', 'start'], context)).rejects.toThrow('Docker não encontrado')
  })

  it('refuses an invalid --slug before touching Docker', async () => {
    const context = testContext(root, localApi)

    await expect(runCli(['dev', 'start', '--slug', 'Bad-Slug'], context)).rejects.toThrow(
      'Slug inválido',
    )
    expect(context.dockerRuns).toEqual([])
  })
})

describe('dev stop and status', () => {
  it('say there is nothing before the first start', async () => {
    const context = testContext(root, localApi)

    expect(await runCli(['dev', 'stop'], context)).toBe(0)
    expect(await runCli(['dev', 'status'], context)).toBe(0)
    expect(context.dockerRuns).toEqual([])
  })

  it('stop keeps the volumes unless --reset, which also forgets the project', async () => {
    const context = testContext(root, localApi)
    await runCli(['dev', 'start'], context)

    expect(await runCli(['dev', 'stop'], context)).toBe(0)
    expect(context.dockerRuns.at(-1)?.args.at(-1)).toBe('down')
    expect(await runCli(['dev', 'stop', '--reset'], context)).toBe(0)
    expect(context.dockerRuns.at(-1)?.args.slice(-2)).toEqual(['down', '--volumes'])
    await expect(readFile(join(root, '.nelcota', 'dev', 'project.json'))).rejects.toThrow()
  })

  it('status shows the containers', async () => {
    const context = testContext(root, localApi)
    await runCli(['dev', 'start'], context)

    expect(await runCli(['dev', 'status'], context)).toBe(0)
    expect(context.dockerRuns.at(-1)?.args.slice(-2)).toEqual(['ps', '--all'])
  })
})
