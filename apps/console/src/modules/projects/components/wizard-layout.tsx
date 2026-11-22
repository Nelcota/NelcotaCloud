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
 * The flow's frame: a quiet title and the steps on the left (a track above on phones), the step
 * beside. The flow's name stays small so each step's question is what reads first.
 */
export function WizardLayout({ position, onStepSelect, children }: WizardLayoutProps): JSX.Element {
  return (
    <div className="mx-auto grid w-full max-w-6xl min-w-0 items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
      <aside className="grid min-w-0 gap-5 lg:sticky lg:top-6">
        <BackLink label="Projetos" href="/" />
        <h1 className="text-sm font-medium text-muted-foreground">Novo projeto</h1>
        <WizardSteps position={position} onStepSelect={onStepSelect} />
      </aside>
      <div className="min-w-0 lg:pt-1">{children}</div>
    </div>
  )
}
