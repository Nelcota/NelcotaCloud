import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { NelcotaApi } from '../nelcota-api'
import { runTool } from '../tool-result'

type TableSummary = { name: string; [key: string]: unknown }

/** Reading the shape of the database: tables, columns, keys, indexes and policies. */
export function registerSchemaTools(server: McpServer, api: NelcotaApi): void {
  server.registerTool(
    'list_tables',
    {
      title: 'Listar tabelas',
      description:
        'Lists the tables and views of the project database (public schema) with row counts, size and whether row level security is on.',
      annotations: { readOnlyHint: true },
    },
    () =>
      runTool(async () => {
        const schema = await readSchema(api)

        return schema.tables.map((table) => ({
          name: table.name,
          kind: table.kind,
          rls_enabled: table.rls_enabled,
          estimated_rows: table.estimated_rows,
          size_bytes: table.size_bytes,
        }))
      }),
  )

  server.registerTool(
    'describe_table',
    {
      title: 'Descrever tabela',
      description:
        'Shows one table: columns with types and defaults, foreign keys, indexes and row level security policies.',
      inputSchema: { table: z.string().min(1).max(63) },
      annotations: { readOnlyHint: true },
    },
    ({ table }) =>
      runTool(async () => {
        const schema = await readSchema(api)
        const found = schema.tables.find((candidate) => candidate.name === table)

        if (found === undefined) {
          throw new Error(`A tabela ${table} não existe no schema public.`)
        }

        return found
      }),
  )
}

async function readSchema(api: NelcotaApi): Promise<{ tables: TableSummary[] }> {
  const schema = await api.call({ method: 'GET', path: '/database/v1/schema' })

  if (typeof schema !== 'object' || schema === null || 'tables' in schema === false) {
    throw new Error('A API devolveu um schema inesperado.')
  }

  const tables: unknown = schema.tables

  if (Array.isArray(tables) === false) {
    return { tables: [] }
  }

  return { tables: tables.filter(isTable) }
}

function isTable(value: unknown): value is TableSummary {
  return typeof value === 'object' && value !== null && 'name' in value
}
