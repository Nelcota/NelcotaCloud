import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { CommandContext, FetchFunction } from '../../src/cli/command-context'
import type { DockerRun } from '../../src/dev/docker-runner'

export type RecordedRequest = {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

export type FakeReply = { status: number; body?: unknown }

export type TestContext = CommandContext & {
  printed: string[]
  notes: string[]
  requests: RecordedRequest[]
  dockerRuns: DockerRun[]
}

export async function temporaryFolder(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'nelcota-cli-'))
}

/** A context whose network answers with `reply` and whose Docker always succeeds. */
export function testContext(
  cwd: string,
  reply: (request: RecordedRequest) => FakeReply,
  overrides: Partial<CommandContext> = {},
): TestContext {
  const printed: string[] = []
  const notes: string[] = []
  const requests: RecordedRequest[] = []
  const dockerRuns: DockerRun[] = []

  return {
    cwd,
    environment: {},
    output: { print: (text) => printed.push(text), note: (text) => notes.push(text) },
    fetch: fakeFetch(requests, reply),
    docker: async (run) => {
      dockerRuns.push(run)

      return 0
    },
    confirm: async () => false,
    isInteractive: () => false,
    now: () => new Date('2026-11-22T13:45:07Z'),
    sleep: async () => undefined,
    ...overrides,
    printed,
    notes,
    requests,
    dockerRuns,
  }
}

function fakeFetch(
  requests: RecordedRequest[],
  reply: (request: RecordedRequest) => FakeReply,
): FetchFunction {
  return async (url, init) => {
    const request = {
      method: init?.method ?? 'GET',
      url,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: parseBody(init?.body),
    }
    requests.push(request)
    const { status, body } = reply(request)

    return new Response(JSON.stringify(body ?? null), { status })
  }
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') {
    return undefined
  }

  return JSON.parse(body) as unknown
}
