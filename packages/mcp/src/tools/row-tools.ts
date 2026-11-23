import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { NelcotaApi } from '../nelcota-api'
import { filterParam, filterSchema } from '../row-filters'
import { runTool } from '../tool-result'

const tableName = z.string().min(1).max(63)
const filters = z.array(filterSchema).max(10)
/** Writes must name their rows: the API refuses an update or delete without a filter. */
const requiredFilters = filters.min(1)
const row = z.record(z.string(), z.unknown())

/** Reading and writing rows through the Data API, as the service role (no RLS). */
export function registerRowTools(server: McpServer, api: NelcotaApi): void {
  server.registerTool(
    'query_rows',
    {
      title: 'Ler linhas',
      description:
        'Reads rows of a table. `select` takes columns and embeds (`id,title,author(name)`), filters narrow them, `order` sorts (`created_at.desc`). At most 1000 rows.',
      inputSchema: {
        table: tableName,
        select: z.string().max(500).optional(),
        filters: filters.optional(),
        order: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(1000).default(50),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool(() =>
        api.call({
          method: 'GET',
          path: `/rest/v1/${encodeURIComponent(input.table)}`,
          query: [
            ...optional('select', input.select),
            ...optional('order', input.order),
            ['limit', String(input.limit)],
            ['offset', String(input.offset)],
            ...(input.filters ?? []).map(filterParam),
          ],
        }),
      ),
  )

  server.registerTool(
    'insert_rows',
    {
      title: 'Inserir linhas',
      description:
        'Inserts one or more rows (up to 1000). Columns left out take their defaults. Returns the inserted rows.',
      inputSchema: { table: tableName, rows: z.array(row).min(1).max(1000) },
    },
    ({ table, rows }) =>
      runTool(() =>
        api.call({
          method: 'POST',
          path: `/rest/v1/${encodeURIComponent(table)}`,
          body: rows,
          prefer: 'return=representation',
        }),
      ),
  )

  server.registerTool(
    'update_rows',
    {
      title: 'Alterar linhas',
      description:
        'Sets the given columns on every row the filters match (at least one filter). Returns the changed rows.',
      inputSchema: { table: tableName, filters: requiredFilters, values: row },
      annotations: { destructiveHint: true },
    },
    (input) =>
      runTool(() =>
        api.call({
          method: 'PATCH',
          path: `/rest/v1/${encodeURIComponent(input.table)}`,
          query: input.filters.map(filterParam),
          body: input.values,
          prefer: 'return=representation',
        }),
      ),
  )

  server.registerTool(
    'delete_rows',
    {
      title: 'Excluir linhas',
      description:
        'Deletes every row the filters match (at least one filter). Cannot be undone. Returns the deleted rows.',
      inputSchema: { table: tableName, filters: requiredFilters },
      annotations: { destructiveHint: true },
    },
    (input) =>
      runTool(() =>
        api.call({
          method: 'DELETE',
          path: `/rest/v1/${encodeURIComponent(input.table)}`,
          query: input.filters.map(filterParam),
          prefer: 'return=representation',
        }),
      ),
  )
}

function optional(name: string, value: string | undefined): (readonly [string, string])[] {
  if (value === undefined || value.trim() === '') {
    return []
  }

  return [[name, value]]
}
