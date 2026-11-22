import type { FormEvent, JSX, ReactNode } from 'react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
import { cn } from '@/shared/lib/utils'
import { FocusedError } from '@/shared/ui/step-dialog/focused-error'
import { BackButton, ForwardButton } from '@/shared/ui/step-dialog/step-dialog-buttons'
import { StepTrack } from '@/shared/ui/step-dialog/step-track'

export type DialogStep = {
  /** One or two words, shown in the step track ("Endereço", "Eventos", "Revisar"). */
  label: string
  /** One sentence under the track: what to do here. */
  description?: string
  content: ReactNode
  /** What the step still needs ("Escolha o tipo"); `null` once Continue can be pressed. */
  missing: string | null
}

export type StepDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  /** What the whole task does, in a sentence. */
  description?: string
  steps: DialogStep[]
  finishLabel: string
  /** Runs on the last step; the dialog stays open and busy until it settles, with any error. */
  onFinish: () => Promise<void>
}

/**
 * A task split into a few guided steps; the last step does it. Enter continues, Voltar (or a done
 * step in the track) keeps what was typed.
 */
export function StepDialog(props: StepDialogProps): JSX.Element {
  const [index, setIndex] = useState(0)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const step = props.steps[index]
  const lastIndex = props.steps.length - 1

  function changeOpen(isOpen: boolean): void {
    if (isWorking) {
      return
    }

    if (isOpen === false) {
      setIndex(0)
      setError(null)
    }

    props.onOpenChange(isOpen)
  }

  function goTo(target: number): void {
    if (target < index) {
      setIndex(target)
    }
  }

  async function advance(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (step === undefined || step.missing !== null || isWorking) {
      return
    }

    if (index < lastIndex) {
      setIndex(index + 1)
      return
    }

    setIsWorking(true)
    setError(null)

    try {
      await props.onFinish()
      setIsWorking(false)
      changeOpen(false)
    } catch (failure) {
      setIsWorking(false)
      setError(failure)
    }
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <form onSubmit={advance} className="flex min-h-0 min-w-0 flex-col">
          <DialogHeader className="gap-1 border-b border-border/60 px-5 pt-5 pb-4 pe-12">
            <DialogTitle>{props.title}</DialogTitle>
            <DialogDescription className={cn(props.description === undefined && 'sr-only')}>
              {props.description ?? props.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto overscroll-contain p-5">
            <StepTrack
              labels={props.steps.map((candidate) => candidate.label)}
              activeIndex={index}
              onStepClick={goTo}
            />
            <StepDescription description={step?.description} />
            {step?.content}
            <FocusedError error={error} />
          </div>
          <DialogFooter className="items-center border-t border-border/60 bg-surface px-5 py-3">
            <MissingNote missing={step?.missing ?? null} />
            <BackButton
              index={index}
              isDisabled={isWorking}
              onBack={() => setIndex(index - 1)}
              onCancel={() => changeOpen(false)}
            />
            <ForwardButton
              isLast={index === lastIndex}
              isWorking={isWorking}
              isDisabled={step?.missing !== null}
              finishLabel={props.finishLabel}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StepDescription({ description }: { description?: string }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-xs text-muted-foreground">{description}</p>
}

function MissingNote({ missing }: { missing: string | null }): JSX.Element | null {
  if (missing === null) {
    return null
  }

  return <span className="me-auto text-xs text-muted-foreground">{missing}</span>
}
