import type { JSX } from 'react'

import type { SetupStep } from '@/modules/overview/components/setup-steps'
import { Progress } from '@/shared/ui/primitives/progress'

/** How far the setup is: "3 de 5" and a bar. */
export function SetupProgress({ steps }: { steps: SetupStep[] }): JSX.Element {
  const done = steps.filter((step) => step.isDone).length
  const label = `${done} de ${steps.length}`

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Configuração</span>
        <span className="font-medium text-heading tabular-nums">{label}</span>
      </div>
      <Progress
        value={done}
        max={steps.length}
        aria-label="Configuração"
        aria-valuetext={label}
        className="*:data-[slot=progress-indicator]:bg-success"
      />
    </div>
  )
}
