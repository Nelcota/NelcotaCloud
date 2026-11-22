import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import { ApiCallError } from './nelcota-api'

/** What an agent reads back: the API's JSON, pretty-printed. */
export function jsonResult(payload: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload ?? { ok: true }, null, 2) }] }
}

/** Runs a tool and turns a refusal into an error result the agent can read and act on. */
export async function runTool(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await work())
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: describe(error) }] }
  }
}

function describe(error: unknown): string {
  if (error instanceof ApiCallError) {
    return `${error.code} (${error.status}): ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Falha desconhecida.'
}
