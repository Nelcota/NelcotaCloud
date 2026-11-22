import type { JSX } from 'react'

import { CopyTextButton } from '@/modules/overview/components/copy-text-button'

/** Copies the chosen agent's prompt; disabled until the project context has loaded. */
export function CopyPromptButton({ prompt }: { prompt: string | null }): JSX.Element {
  return <CopyTextButton text={prompt} label="Copiar prompt" announce="Prompt copiado." />
}
