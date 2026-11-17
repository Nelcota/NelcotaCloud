import type { FormEvent, JSX, ReactNode } from 'react'
import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import type { ReviewItem } from '@/shared/ui/review-list'
import { FocusedError } from '@/shared/ui/step-dialog/focused-error'
import { StepFooter } from '@/shared/ui/step-dialog/step-footer'
import { StepHeading } from '@/shared/ui/step-dialog/step-heading'
import { StepList } from '@/shared/ui/step-dialog/step-list'
import { StepPreview } from '@/shared/ui/step-dialog/step-preview'
import { StepProgress } from '@/shared/ui/step-dialog/step-progress'

/**
 * Wide, with a fixed height: the step list, the step and the preview sit side by side, and moving
 * between steps of different lengths never resizes or moves the dialog.
 */
const LAYOUT =
  'flex h-[min(46rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(76rem,calc(100%-4rem))]'

export type DialogStep = {
  /** One or two words, shown in the step list ("Endereço", "Eventos", "Revisar"). */
  label: string
  /** One sentence under the step's title: what to do here. */
  description?: string
  /** What happens, as a picture; steps without one keep the previous picture. */
  illustration?: ReactNode
  content: ReactNode
  /** What the step still needs ("Escolha o tipo"); `null` once Continue can be pressed. */
  missing: string | null
}

export type StepDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  /** What the whole task does, in a sentence; read by screen readers, shown on phones. */
  description?: string
  steps: DialogStep[]
  /** What has been filled in so far, shown beside the picture as it grows. */
  summary?: ReviewItem[]
  finishLabel: string
  /** The forward button while the last step runs ("Criando chave…"); "Salvando…" by default. */
  workingLabel?: string
  /** Runs on the last step; the dialog stays open and busy until it settles, with any error. */
  onFinish: () => Promise<void>
}

/**
 * A task split into a few guided steps, each with its picture of what will happen; the last
 * step does it. Enter continues, Voltar (or a done step in the list) keeps what was typed.
 */
export function StepDialog(props: StepDialogProps): JSX.Element {
  const [index, setIndex] = useState(0)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const step = props.steps[index]
  const labels = props.steps.map((candidate) => candidate.label)
  const lastIndex = props.steps.length - 1

  function changeOpen(isOpen: boolean): void {
    if (isWorking) {
      return
    }

    props.onOpenChange(isOpen)
  }

  /** Back to the first step only once closed, so the closing dialog does not flash step one. */
  function resetOnceClosed(isOpen: boolean): void {
    if (isOpen) {
      return
    }

    setIndex(0)
    setError(null)
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
      props.onOpenChange(false)
    } catch (failure) {
      setIsWorking(false)
      setError(failure)
    }
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen} onOpenChangeComplete={resetOnceClosed}>
      <DialogContent className={LAYOUT}>
        <form onSubmit={advance} className="flex min-h-0 flex-1 flex-col">
          <header className="border-b px-6 py-4 pr-14">
            <DialogTitle className="text-base">{props.title}</DialogTitle>
            <p className="sr-only" aria-live="polite">
              Passo {index + 1} de {props.steps.length}: {step?.label}
            </p>
            <DialogDescription className="mt-1 lg:sr-only">{props.description}</DialogDescription>
          </header>
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)_17rem] xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
            <nav aria-label="Passos" className="hidden overflow-y-auto border-r p-4 lg:block">
              <StepList labels={labels} current={index} onSelect={setIndex} />
            </nav>
            <section
              key={index}
              className="animate-step-in @container relative min-h-0 overflow-y-auto p-6 motion-reduce:animate-none lg:p-8"
            >
              <div className="grid max-w-2xl gap-6">
                <div className="lg:hidden">
                  <StepProgress labels={labels} current={index} />
                </div>
                <StepHeading label={step?.label} description={step?.description} />
                {step?.content}
                <FocusedError error={error} />
              </div>
            </section>
            <StepPreview
              illustration={illustrationAt(props.steps, index)}
              summary={props.summary ?? []}
            />
          </div>
          <StepFooter
            index={index}
            isLast={index === lastIndex}
            isWorking={isWorking}
            missing={step?.missing ?? null}
            labels={{ finish: props.finishLabel, working: props.workingLabel ?? 'Salvando…' }}
            onBack={() => setIndex(index - 1)}
            onCancel={() => changeOpen(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The picture of the current step, or of the closest step before it that has one. */
function illustrationAt(steps: DialogStep[], index: number): ReactNode {
  const shown = steps.slice(0, index + 1).findLast((step) => step.illustration !== undefined)

  return shown?.illustration
}
