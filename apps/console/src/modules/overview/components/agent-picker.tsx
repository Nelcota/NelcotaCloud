import type { JSX } from 'react'

import { AI_AGENTS, type AiAgentId } from '@/modules/overview/components/ai-agent-prompts'
import { AgentLogo } from '@/modules/overview/components/agent-logo'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/primitives/toggle-group'

type AgentPickerProps = {
  value: AiAgentId
  onValueChange: (value: string) => void
}

/** The coding agents as chips with their official logos. */
export function AgentPicker({ value, onValueChange }: AgentPickerProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Agente"
      value={value}
      className="flex-wrap"
      onValueChange={(next) => {
        if (next !== '') {
          onValueChange(next)
        }
      }}
    >
      {AI_AGENTS.map((agent) => (
        <ToggleGroupItem key={agent.id} value={agent.id} className="gap-2 px-3">
          <AgentLogo agentId={agent.id} />
          {agent.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
