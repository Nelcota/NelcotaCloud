import { type JSX, useState } from 'react'

import {
  AI_AGENTS,
  type AiAgent,
  type AiAgentId,
  agentPrompt,
} from '@/modules/overview/components/ai-agent-prompts'
import type { AiContext } from '@/modules/overview/components/ai-context'
import { AgentPicker } from '@/modules/overview/components/agent-picker'
import { CopyPromptButton } from '@/modules/overview/components/copy-prompt-button'
import { PromptDialog } from '@/modules/overview/components/prompt-dialog'
import { useAiContext } from '@/modules/overview/queries/use-ai-context'
import { LoadError } from '@/shared/ui/load-error'

const DEFAULT_AGENT: AiAgentId = 'claude-code'

/** Pick the coding agent and copy a prompt that already knows this project. */
export function BuildWithAiPanel({ projectId }: { projectId: string }): JSX.Element {
  const { context, error, retry } = useAiContext(projectId)
  const [agentId, setAgentId] = useState<AiAgentId>(DEFAULT_AGENT)
  const agent = AI_AGENTS.find((candidate) => candidate.id === agentId)

  function choose(value: string): void {
    const chosen = AI_AGENTS.find((candidate) => candidate.id === value)

    if (chosen === undefined) {
      return
    }

    setAgentId(chosen.id)
  }

  if (agent === undefined) {
    return <LoadError error={error} onRetry={retry} />
  }

  const prompt = promptOf(agent, context)

  return (
    <section
      aria-labelledby="build-with-ai-title"
      className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-6"
    >
      <div className="grid gap-1">
        <h2 id="build-with-ai-title" className="text-base font-semibold text-heading">
          Construa com IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Um prompt com a URL, a chave, o login e as tabelas deste projeto.
        </p>
      </div>
      <AgentPicker value={agent.id} onValueChange={choose} />
      <p className="text-sm text-muted-foreground">{agent.placement}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <CopyPromptButton prompt={prompt} />
        <PromptDialog agent={agent} prompt={prompt} />
      </div>
      <div className="empty:hidden">
        <LoadError error={error} onRetry={retry} />
      </div>
    </section>
  )
}

function promptOf(agent: AiAgent, context: AiContext | null): string | null {
  if (context === null) {
    return null
  }

  return agentPrompt(agent.id, context)
}
