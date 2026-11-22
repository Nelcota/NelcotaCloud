import { type JSX, useState } from 'react'

import type { AiAgent } from '@/modules/overview/components/ai-agent-prompts'
import { CodeBlock } from '@/shared/ui/code-block'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'

const PROMPT_HEIGHT = 420

type PromptDialogProps = { agent: AiAgent; prompt: string | null }

/** The full prompt, read only on demand so it never takes room on the page. */
export function PromptDialog({ agent, prompt }: PromptDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        type="button"
        variant="outline"
        disabled={prompt === null}
        aria-busy={prompt === null}
        aria-haspopup="dialog"
        className="disabled:cursor-progress"
        onClick={() => setIsOpen(true)}
      >
        Ver prompt
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prompt para {agent.label}</DialogTitle>
          <DialogDescription>{agent.placement}</DialogDescription>
        </DialogHeader>
        <CodeBlock
          code={prompt ?? ''}
          title={agent.fileName}
          copyLabel={`prompt para ${agent.label}`}
          maxHeight={PROMPT_HEIGHT}
          isWrapped
        />
      </DialogContent>
    </Dialog>
  )
}
