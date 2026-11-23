import type { FormEvent, JSX, ReactNode } from 'react'
import { useId, useState } from 'react'

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
import { cn } from '@/shared/lib/utils'
import { missingNoteReference } from '@/shared/lib/missing-unless'
import { MissingNote } from '@/shared/ui/missing-note'
import { useReadOnlyReason } from '@/shared/auth/write-access'
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
  const missingId = useId()
  // A viewer learns on the first step that the wizard cannot be saved, not after filling it.
  const missing = useReadOnlyReason() ?? step?.missing ?? null

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
    // The dialog is portaled, but React still bubbles its submit to a form around the trigger.
    event.stopPropagation()

    if (step === undefined || missing !== null || isWorking) {
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
        className="sm:max-w-2xl"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <form onSubmit={advance} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            <DialogDescription className={cn(props.description === undefined && 'sr-only')}>
              {props.description ?? props.title}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <StepTrack
              labels={props.steps.map((candidate) => candidate.label)}
              activeIndex={index}
              onStepClick={goTo}
            />
            <StepDescription description={step?.description} />
            {step?.content}
            <FocusedError error={error} />
          </DialogBody>
          <DialogFooter>
            <MissingNote id={missingId} missing={missing} />
            <BackButton
              index={index}
              isDisabled={isWorking}
              onBack={() => setIndex(index - 1)}
              onCancel={() => changeOpen(false)}
            />
            <ForwardButton
              isLast={index === lastIndex}
              isWorking={isWorking}
              isDisabled={missing !== null}
              describedBy={missingNoteReference(missingId, missing)}
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
