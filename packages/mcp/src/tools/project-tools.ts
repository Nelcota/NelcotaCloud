import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { NelcotaApi } from '../nelcota-api'
import { runTool } from '../tool-result'

/** SQL, users, the activity log and traffic: what an agent needs to build and debug an app. */
export function registerProjectTools(server: McpServer, api: NelcotaApi): void {
  server.registerTool(
    'run_sql',
    {
      title: 'Executar SQL',
      description:
        'Runs SQL in the project database as its developer role (owner of public, bypasses RLS), for up to 15 seconds. Use it to create tables, indexes, policies and functions. New tables get row level security on.',
      inputSchema: { query: z.string().min(1).max(100_000) },
      annotations: { destructiveHint: true },
    },
    ({ query }) =>
      runTool(() => api.call({ method: 'POST', path: '/database/v1/sql', body: { query } })),
  )

  server.registerTool(
    'list_users',
    {
      title: 'Listar usuários',
      description:
        'Lists the users of the app, newest first. `email` searches by address; `status` narrows to unverified or banned users.',
      inputSchema: {
        email: z.string().max(254).optional(),
        status: z.enum(['unverified', 'banned']).optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool(() =>
        api.call({
          method: 'GET',
          path: '/auth/v1/admin/users/page',
          query: [
            ...present('email', input.email),
            ...present('status', input.status),
            ['limit', String(input.limit)],
          ],
        }),
      ),
  )

  server.registerTool(
    'activity_log',
    {
      title: 'Atividade',
      description:
        'Reads the project activity log: logins, refused logins, password resets and admin actions, newest first, over the last `days` days.',
      inputSchema: {
        days: z.number().int().min(1).max(90).default(7),
        search: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool(() =>
        api.call({
          method: 'GET',
          path: '/auth/v1/admin/audit-events',
          query: [
            ['days', String(input.days)],
            ['limit', String(input.limit)],
            ...present('search', input.search),
          ],
        }),
      ),
  )

  server.registerTool(
    'api_traffic',
    {
      title: 'Tráfego da Data API',
      description:
        'Data API traffic over 24h, 7d or 30d: requests, client and server errors, mean time, the busiest tables and status codes.',
      inputSchema: { period: z.enum(['24h', '7d', '30d']).default('24h') },
      annotations: { readOnlyHint: true },
    },
    ({ period }) =>
      runTool(() =>
        api.call({ method: 'GET', path: '/database/v1/usage', query: [['period', period]] }),
      ),
  )

  server.registerTool(
    'project_settings',
    {
      title: 'Ajustes do projeto',
      description: 'Reads the project name, site URL and whether email verification is required.',
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => api.call({ method: 'GET', path: '/auth/v1/admin/settings' })),
  )
}

function present(name: string, value: string | undefined): (readonly [string, string])[] {
  if (value === undefined || value.trim() === '') {
    return []
  }

  return [[name, value.trim()]]
}
