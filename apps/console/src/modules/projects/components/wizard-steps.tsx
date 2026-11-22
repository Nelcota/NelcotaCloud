import { Check } from 'lucide-react'
import type { JSX } from 'react'

import {
  WIZARD_STEPS,
  type WizardPosition,
  type WizardStepId,
  positionIndex,
} from '@/modules/projects/components/wizard-step'
import { cn } from '@/shared/lib/utils'

type StepState = 'done' | 'current' | 'next'

type WizardStepsProps = {
  position: WizardPosition
  onStepSelect?: (step: WizardStepId) => void
}

/** The numbered steps: a vertical list on wide screens, a horizontal track on phones. */
export function WizardSteps({ position, onStepSelect }: WizardStepsProps): JSX.Element {
  const currentIndex = positionIndex(position)

  return (
    <ol
      aria-label="Etapas"
      className="flex min-w-0 items-center gap-2 overflow-x-auto lg:flex-col lg:items-stretch lg:gap-0.5"
    >
      {WIZARD_STEPS.map((step, index) => (
        <WizardStepItem
          key={step.id}
          number={index + 1}
          label={step.label}
          state={stepState(index, currentIndex)}
          onSelect={selectionOf(step.id, onStepSelect)}
        />
      ))}
    </ol>
  )
}

type WizardStepItemProps = {
  number: number
  label: string
  state: StepState
  onSelect: (() => void) | undefined
}

function WizardStepItem({ number, label, state, onSelect }: WizardStepItemProps): JSX.Element {
  const content = <StepContent number={number} label={label} state={state} />

  return (
    <li
      aria-current={currentMarker(state)}
      className="flex shrink-0 items-center gap-2 not-last:after:h-px not-last:after:w-6 not-last:after:bg-border lg:not-last:after:hidden"
    >
      <StepTarget isSelectable={state === 'done' && onSelect !== undefined} onSelect={onSelect}>
        {content}
      </StepTarget>
    </li>
  )
}

type StepTargetProps = {
  isSelectable: boolean
  onSelect: (() => void) | undefined
  children: JSX.Element
}

/** A finished step is a button back to it; the others are plain text. */
function StepTarget({ isSelectable, onSelect, children }: StepTargetProps): JSX.Element {
  if (isSelectable === false) {
    return (
      <div className="flex w-full items-center gap-2.5 rounded-lg lg:px-2.5 lg:py-2">
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-lg text-left hover:bg-surface-hover lg:px-2.5 lg:py-2"
    >
      {children}
    </button>
  )
}

function StepContent({ number, label, state }: Omit<WizardStepItemProps, 'onSelect'>): JSX.Element {
  return (
    <>
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full border text-sm font-medium tabular-nums',
          state === 'current' && 'border-primary bg-primary text-primary-foreground',
          state === 'done' && 'border-primary/40 text-primary',
          state === 'next' && 'text-muted-foreground',
        )}
      >
        <StepMark number={number} state={state} />
      </span>
      <span
        className={cn(
          'text-sm whitespace-nowrap',
          state === 'current' && 'font-medium text-heading',
          state !== 'current' && 'max-sm:sr-only text-muted-foreground',
        )}
      >
        {label}
        {state === 'done' && <span className="sr-only"> (concluída)</span>}
      </span>
    </>
  )
}

function StepMark({ number, state }: { number: number; state: StepState }): JSX.Element {
  if (state === 'done') {
    return <Check aria-hidden className="size-4" />
  }

  return <span aria-hidden>{number}</span>
}

function currentMarker(state: StepState): 'step' | undefined {
  if (state === 'current') {
    return 'step'
  }

  return undefined
}

function stepState(index: number, currentIndex: number): StepState {
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
