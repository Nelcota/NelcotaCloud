import type { JSX, ReactNode } from 'react'

import { WizardSteps } from '@/modules/projects/components/wizard-steps'
import type { WizardPosition, WizardStepId } from '@/modules/projects/components/wizard-step'
import { BackLink } from '@/shared/ui/back-link'

type WizardLayoutProps = {
  position: WizardPosition
  /** Lets a finished step be opened again; absent when going back is not possible. */
  onStepSelect?: (step: WizardStepId) => void
  children: ReactNode
}

/**
 * The flow's frame: the steps as a checklist on the left (a track above on phones), the step
 * beside. The flow's name stays small so each step's question is what reads first.
 */
export function WizardLayout({ position, onStepSelect, children }: WizardLayoutProps): JSX.Element {
  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <aside className="grid min-w-0 gap-3 lg:sticky lg:top-4">
        <BackLink label="Projetos" href="/" />
        <div className="grid gap-2 lg:rounded-xl lg:bg-card lg:p-2">
          <h1 className="px-2 pt-1 text-2xs text-muted-foreground max-lg:sr-only">Novo projeto</h1>
          <WizardSteps position={position} onStepSelect={onStepSelect} />
        </div>
      </aside>
      <div className="min-w-0 animate-page-in">{children}</div>
    </div>
  )
}
