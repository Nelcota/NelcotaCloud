import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { readConfig } from './config'
import { NelcotaApi } from './nelcota-api'
import { registerProjectTools } from './tools/project-tools'
import { registerRowTools } from './tools/row-tools'
import { registerSchemaTools } from './tools/schema-tools'

const SERVER_INFO = { name: 'nelcota', version: '0.1.0' }

/**
 * Runs over stdio for the agent that started it (Claude Code, Cursor, Codex). Logs go to
 * stderr: stdout carries the protocol.
 */
async function main(): Promise<void> {
  const config = readConfig(process.env)
  const api = new NelcotaApi(config)
  const server = new McpServer(SERVER_INFO, {
    instructions:
      'Tools for one NelcotaCloud project (Auth and a Postgres database served as a REST API under row level security). Inspect with list_tables and describe_table before writing; change the schema with run_sql.',
  })
  registerSchemaTools(server, api)
  registerRowTools(server, api)
  registerProjectTools(server, api)
  await server.connect(new StdioServerTransport())
}

main().catch((error: unknown) => {
  process.stderr.write(`nelcota-mcp: ${String(error instanceof Error ? error.message : error)}\n`)
  process.exitCode = 1
})
