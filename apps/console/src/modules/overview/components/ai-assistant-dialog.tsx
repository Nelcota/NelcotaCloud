import { Sparkles } from 'lucide-react'
import { type JSX, useState } from 'react'

import { AgentPicker } from '@/modules/overview/components/agent-picker'
import {
  AI_AGENTS,
  type AiAgentId,
  agentPrompt,
} from '@/modules/overview/components/ai-agent-prompts'
import { CopyContextButton } from '@/modules/overview/components/copy-context-button'
import { CopyPromptButton } from '@/modules/overview/components/copy-prompt-button'
import type { AiContext } from '@/modules/overview/components/ai-context'
import { useAiContext } from '@/modules/overview/queries/use-ai-context'
import { CodeBlock } from '@/shared/ui/code-block'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'

const DEFAULT_AGENT: AiAgentId = 'claude-code'
const PROMPT_HEIGHT = 260

/** The top bar's "IA" button: a prompt for the chosen coding agent that already knows the project. */
export function AiAssistantDialog({ projectId }: { projectId: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        className="font-mono"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles aria-hidden data-icon="inline-start" />
        IA
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Construa com IA</DialogTitle>
          <DialogDescription>
            O prompt já leva a URL, a chave publicável, o login e as tabelas deste projeto.
          </DialogDescription>
        </DialogHeader>
        <AssistantBody projectId={projectId} />
      </DialogContent>
    </Dialog>
  )
}

/** Mounted only while the dialog is open, so the project context loads on demand. */
function AssistantBody({ projectId }: { projectId: string }): JSX.Element {
  const { context, error, retry } = useAiContext(projectId)
  const [agentId, setAgentId] = useState<AiAgentId>(DEFAULT_AGENT)
  const agent = AI_AGENTS.find((candidate) => candidate.id === agentId) ?? AI_AGENTS[0]

  function choose(value: string): void {
    const chosen = AI_AGENTS.find((candidate) => candidate.id === value)

    if (chosen !== undefined) {
      setAgentId(chosen.id)
    }
  }

  if (agent === undefined) {
    return <LoadError error={error} onRetry={retry} />
  }

  const prompt = promptOf(agent.id, context)

  return (
    <div className="grid min-w-0 gap-4">
      <AgentPicker value={agent.id} onValueChange={choose} />
      <p className="text-xs text-muted-foreground">{agent.placement}</p>
      <CodeBlock
        code={prompt ?? 'Carregando o contexto do projeto…'}
        title={agent.fileName}
        copyLabel={`prompt para ${agent.label}`}
        maxHeight={PROMPT_HEIGHT}
        isWrapped
      />
      <div className="empty:hidden">
        <LoadError error={error} onRetry={retry} />
      </div>
      <DialogFooter>
        <CopyContextButton context={context} />
        <CopyPromptButton prompt={prompt} />
      </DialogFooter>
    </div>
  )
}

function promptOf(agentId: AiAgentId, context: AiContext | null): string | null {
  if (context === null) {
    return null
  }

  return agentPrompt(agentId, context)
}
