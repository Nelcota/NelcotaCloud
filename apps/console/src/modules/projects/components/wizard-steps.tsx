import type { JSX } from 'react'

import {
  WIZARD_STEPS,
  type WizardPosition,
  type WizardStepId,
  positionIndex,
} from '@/modules/projects/components/wizard-step'
import { type StepMarkState, StepMark } from '@/shared/ui/step-mark'
import { cn } from '@/shared/lib/utils'

type WizardStepsProps = {
  position: WizardPosition
  onStepSelect?: (step: WizardStepId) => void
}

/** The steps as a checklist: a vertical list on wide screens, a horizontal track on phones. */
export function WizardSteps({ position, onStepSelect }: WizardStepsProps): JSX.Element {
  const currentIndex = positionIndex(position)

  return (
    <ol
      aria-label="Etapas"
      className="flex min-w-0 items-center gap-1 overflow-x-auto lg:flex-col lg:items-stretch lg:gap-0.5"
    >
      {WIZARD_STEPS.map((step, index) => (
        <WizardStepItem
          key={step.id}
          label={step.label}
          state={stepState(index, currentIndex)}
          onSelect={selectionOf(step.id, onStepSelect)}
        />
      ))}
    </ol>
  )
}

type WizardStepItemProps = {
  label: string
  state: StepMarkState
  onSelect: (() => void) | undefined
}

function WizardStepItem({ label, state, onSelect }: WizardStepItemProps): JSX.Element {
  return (
    <li
      aria-current={currentMarker(state)}
      className="flex shrink-0 items-center gap-1 not-last:after:h-px not-last:after:w-4 not-last:after:bg-border lg:not-last:after:hidden"
    >
      <StepTarget isSelectable={state === 'done' && onSelect !== undefined} onSelect={onSelect}>
        <StepMark state={state} />
        <span
          className={cn(
            'text-xs whitespace-nowrap text-muted-foreground',
            state === 'current' && 'font-medium text-heading',
            state === 'done' && 'text-foreground',
            state !== 'current' && 'max-sm:sr-only',
          )}
        >
          {label}
          {state === 'done' && <span className="sr-only"> (concluída)</span>}
        </span>
      </StepTarget>
    </li>
  )
}

type StepTargetProps = {
  isSelectable: boolean
  onSelect: (() => void) | undefined
  children: JSX.Element[]
}

/** A finished step is a button back to it; the others are plain text. */
function StepTarget({ isSelectable, onSelect, children }: StepTargetProps): JSX.Element {
  const className = 'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left'

  if (isSelectable === false) {
    return <div className={className}>{children}</div>
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(className, 'transition-colors duration-200 hover:bg-surface')}
    >
      {children}
    </button>
  )
}

function currentMarker(state: StepMarkState): 'step' | undefined {
  if (state === 'current') {
    return 'step'
  }

  return undefined
}

function stepState(index: number, currentIndex: number): StepMarkState {
  if (index < currentIndex) {
    return 'done'
  }

  if (index === currentIndex) {
    return 'current'
  }

  return 'next'
}

function selectionOf(
  step: WizardStepId,
  onStepSelect: ((step: WizardStepId) => void) | undefined,
): (() => void) | undefined {
  if (onStepSelect === undefined) {
    return undefined
  }

  return () => onStepSelect(step)
}
