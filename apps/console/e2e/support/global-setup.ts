import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { API_URL, type E2eStack, STACK_FILE, waitForEmail } from './stack'

type CallOptions = { key?: string; token?: string; body?: unknown }

async function call<T>(method: string, path: string, options: CallOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}

  if (options.key !== undefined) {
    headers.apikey = options.key
  }

  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`
  }

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${path}`, { method, headers, body: bodyOf(options) })
  const text = await response.text()

  if (response.ok === false) {
    throw new Error(`${method} ${path} answered ${response.status}: ${text}`)
  }

  if (text === '') {
    return null as T
  }

  return JSON.parse(text) as T
}

function bodyOf(options: CallOptions): string | undefined {
  if (options.body === undefined) {
    return undefined
  }

  return JSON.stringify(options.body)
}

/** A console account with a verified email, signed up through the platform tenant. */
async function createAccount(
  platformKey: string,
): Promise<{ email: string; password: string; token: string; id: string }> {
  const email = `e2e.${randomBytes(4).toString('hex')}@example.test`
  const password = `E2e-${randomBytes(12).toString('base64url')}`
  await call('POST', '/auth/v1/signup', { key: platformKey, body: { email, password } })
  const token = /token=([A-Za-z0-9_-]+)/.exec(await waitForEmail(email))?.[1]

  if (token === undefined) {
    throw new Error('the verification email has no token')
  }

  await call('POST', '/auth/v1/verify-email', { key: platformKey, body: { token } })
  const session = await call<{ access_token: string; user: { id: string } }>(
    'POST',
    '/auth/v1/login',
    { key: platformKey, body: { email, password } },
  )

  return { email, password, token: session.access_token, id: session.user.id }
}

type Owner = { ownerToken: string; projectId: string }

/** A second account invited by the owner, accepting, then turned into a viewer. */
async function joinAsViewer(
  platformKey: string,
  { ownerToken, projectId }: Owner,
): Promise<{ email: string; password: string }> {
  const viewer = await createAccount(platformKey)
  await call('POST', `/platform/v1/projects/${projectId}/invitations`, {
    token: ownerToken,
    body: { email: viewer.email },
  })
  const invitations = await call<{ id: string }[]>('GET', '/platform/v1/invitations', {
    token: viewer.token,
  })
  const invitation = invitations[0]

  if (invitation === undefined) {
    throw new Error('the viewer received no invitation')
  }

  await call('POST', `/platform/v1/invitations/${invitation.id}/accept`, { token: viewer.token })
  await call('PATCH', `/platform/v1/projects/${projectId}/members/${viewer.id}`, {
    token: ownerToken,
    body: { role: 'viewer' },
  })

  return viewer
}

const SEED_SQL = `
create table e2e_itens (
  id bigint generated always as identity primary key,
  nome text not null,
  cidade text
);
insert into e2e_itens (nome, cidade) values ('Caneca', 'Recife'), ('Camiseta', 'Curitiba'), ('Boné', 'Recife');
`

export default async function globalSetup(): Promise<void> {
  const platformKey = process.env.E2E_PLATFORM_KEY

  if (platformKey === undefined || platformKey === '') {
    throw new Error('Set E2E_PLATFORM_KEY to the platform tenant publishable key')
  }

  const account = await createAccount(platformKey)
  const slug = `e2e_${randomBytes(3).toString('hex')}`
  const projectName = 'Loja E2E'
  const project = await call<{ tenant_id: string; secret_key: string; publishable_key: string }>(
    'POST',
    '/platform/v1/projects',
    {
      token: account.token,
      body: { slug, name: projectName, site_url: 'https://loja-e2e.example.com' },
    },
  )
  await call('POST', '/database/v1/sql', { key: project.secret_key, body: { query: SEED_SQL } })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fetch(`${API_URL}/auth/v1/login`, {
      method: 'POST',
      headers: { apikey: project.publishable_key, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ninguem@loja-e2e.example.com', password: 'senha-errada-123' }),
    })
  }

  const users = ['ana@loja-e2e.example.com', 'bruno@loja-e2e.example.com']

  for (const email of users) {
    await call('POST', '/auth/v1/signup', {
      key: project.publishable_key,
      body: { email, password: `Senha-${randomBytes(6).toString('hex')}` },
    })
  }

  const viewer = await joinAsViewer(platformKey, {
    ownerToken: account.token,
    projectId: project.tenant_id,
  })
  const stack: E2eStack = {
    email: account.email,
    password: account.password,
    projectId: project.tenant_id,
    projectName,
    table: 'e2e_itens',
    users,
    viewer: { email: viewer.email, password: viewer.password },
  }
  mkdirSync(dirname(STACK_FILE), { recursive: true })
  writeFileSync(STACK_FILE, JSON.stringify(stack))
}
