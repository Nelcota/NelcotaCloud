import { Bot } from 'lucide-react'
import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { CopyButton } from '@/shared/ui/copy-button'

/** The secret key stays a placeholder: the console never holds one in the browser. */
const MCP_COMMAND = `claude mcp add nelcota -e NELCOTA_SECRET_KEY=nc_sk_... -e NELCOTA_API_URL=${API_BASE_URL} -- node packages/mcp/dist/index.mjs`

/** Next to the prompt: the MCP server lets the agent read and change the project itself. */
export function McpSetupNote(): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <Bot aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="text-xs text-pretty text-muted-foreground">
          Pelo MCP, o agente lê o schema, consulta e altera linhas, roda SQL e vê usuários e
          tráfego, com uma chave secreta que você cria em Chaves de API.
        </p>
        <code className="block truncate font-mono text-2xs text-foreground">{MCP_COMMAND}</code>
      </div>
      <CopyButton value={MCP_COMMAND} description="comando do MCP" isIconOnly />
    </div>
  )
}
