import ClaudeLogo from '~icons/logos/claude-icon'
import CodexLogo from '~icons/logos/codex'
import CodexDarkLogo from '~icons/logos/codex-dark'
import CursorLogo from '~icons/logos/cursor-icon'
import CopilotLogo from '~icons/logos/github-copilot'
import Sparkles from '~icons/solar/stars-minimalistic-linear'
import type { JSX } from 'react'

import type { AiAgentId } from '@/modules/overview/components/ai-agent-prompts'

const LOGO_SIZE = 'size-4 shrink-0'

/** Each agent's official mark, drawn so it reads on the dark and the light theme. */
const LOGOS: Record<AiAgentId, () => JSX.Element> = {
  'claude-code': () => <ClaudeLogo aria-hidden className={LOGO_SIZE} />,
  codex: CodexMark,
  cursor: () => <CursorLogo aria-hidden className={`${LOGO_SIZE} dark:invert`} />,
  copilot: () => <CopilotLogo aria-hidden className={`${LOGO_SIZE} fill-current`} />,
  other: () => <Sparkles aria-hidden className={`${LOGO_SIZE} text-muted-foreground`} />,
}

export function AgentLogo({ agentId }: { agentId: AiAgentId }): JSX.Element {
  const Logo = LOGOS[agentId]

  return <Logo />
}

/** Codex ships a black and a white mark; the theme picks the one that shows. */
function CodexMark(): JSX.Element {
  return (
    <>
      <CodexLogo aria-hidden className={`${LOGO_SIZE} dark:hidden`} />
      <CodexDarkLogo aria-hidden className={`${LOGO_SIZE} hidden dark:block`} />
    </>
  )
}
