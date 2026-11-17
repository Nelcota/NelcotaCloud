import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'
import { BackButton, ForwardLabel } from '@/shared/ui/step-dialog/step-dialog-buttons'

type StepFooterProps = {
  index: number
  isLast: boolean
  isWorking: boolean
  /** What the step still needs, said next to the disabled button; `null` once it is filled. */
  missing: string | null
  labels: { finish: string; working: string }
  onBack: () => void
  onCancel: () => void
}

/** Back or Cancel on the left; on the right, why Continue waits, and the large forward button. */
export function StepFooter(props: StepFooterProps): JSX.Element {
  return (
    <footer className="bg-muted/30 flex items-center justify-between gap-3 border-t px-6 py-4">
      <BackButton
        index={props.index}
        isDisabled={props.isWorking}
        onBack={props.onBack}
        onCancel={props.onCancel}
      />
      <div className="flex min-w-0 items-center gap-4">
        <MissingNote text={props.missing} />
        <Button
          type="submit"
          size="lg"
          className="min-w-40 lg:w-[17rem] xl:w-[22rem]"
          disabled={props.isWorking || props.missing !== null}
          aria-busy={props.isWorking}
        >
          <ForwardText {...props} />
        </Button>
      </div>
    </footer>
  )
}

function ForwardText(props: StepFooterProps): JSX.Element {
  if (props.isWorking) {
    return <>{props.labels.working}</>
  }

  return <ForwardLabel isLast={props.isLast} finishLabel={props.labels.finish} />
}

function MissingNote({ text }: { text: string | null }): JSX.Element | null {
  if (text === null) {
    return null
  }

  return <p className="text-muted-foreground hidden text-right text-sm sm:block">{text}</p>
}
