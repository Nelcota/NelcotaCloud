import type { AiContext } from '@/modules/overview/components/ai-context'
import { contextMarkdown } from '@/modules/overview/components/ai-context-markdown'

export type AiAgentId = 'claude-code' | 'codex' | 'cursor' | 'copilot' | 'other'

export type AiAgent = {
  id: AiAgentId
  label: string
  /** Where the agent reads project instructions from. */
  fileName: string
  /** One line on where to paste the prompt. */
  placement: string
}

export const AI_AGENTS: readonly AiAgent[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    fileName: 'CLAUDE.md',
    placement: 'Cole no CLAUDE.md na raiz do repositório ou direto no chat do Claude Code.',
  },
  {
    id: 'codex',
    label: 'Codex',
    fileName: 'AGENTS.md',
    placement:
      'Salve como AGENTS.md na raiz do repositório: o Codex lê esse arquivo em toda tarefa.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    fileName: '.cursor/rules/nelcota.mdc',
    placement:
      'Salve em .cursor/rules/nelcota.mdc: o Cursor aplica a regra em todo chat do projeto.',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    fileName: '.github/copilot-instructions.md',
    placement:
      'Salve em .github/copilot-instructions.md: o GitHub Copilot usa essas instruções no repositório.',
  },
  {
    id: 'other',
    label: 'Outros',
    fileName: 'AGENTS.md',
    placement: 'Salve como AGENTS.md na raiz do repositório ou cole direto no chat do seu agente.',
  },
]

/** Cursor rules carry their own header, which makes the rule apply to every chat. */
const CURSOR_HEADER = [
  '---',
  'description: Como este app usa o NelcotaCloud (SDK, login, tabelas e RLS)',
  'alwaysApply: true',
  '---',
  '',
].join('\n')

/** The project context in the form the agent reads it from. */
export function agentPrompt(agentId: AiAgentId, context: AiContext): string {
  const markdown = contextMarkdown(context)

  if (agentId === 'cursor') {
    return `${CURSOR_HEADER}${markdown}`
  }

  return markdown
}
