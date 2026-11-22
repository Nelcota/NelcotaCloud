import type { JSX } from 'react'

import type { AiContext } from '@/modules/overview/components/ai-context'
import { contextMarkdown } from '@/modules/overview/components/ai-context-markdown'
import { CopyTextButton } from '@/modules/overview/components/copy-text-button'

/** The project as Markdown for any AI agent: connection, login, tables and the rules. */
export function CopyContextButton({ context }: { context: AiContext | null }): JSX.Element {
  return (
    <CopyTextButton
      text={markdownOf(context)}
      label="Copiar contexto para IA"
      announce="Contexto copiado."
      variant="outline"
    />
  )
}

function markdownOf(context: AiContext | null): string | null {
  if (context === null) {
    return null
  }

  return contextMarkdown(context)
}
