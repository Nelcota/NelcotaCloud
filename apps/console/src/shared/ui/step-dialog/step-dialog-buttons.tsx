import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'

type BackButtonProps = {
  index: number
  isDisabled: boolean
  onBack: () => void
  /** Without it the first step has no button (a page, where a link above already leaves). */
  onCancel?: () => void
}

/** Cancel on the first step, Back after it: closing is never more than one click away. */
export function BackButton(props: BackButtonProps): JSX.Element | null {
  const { index, isDisabled, onBack, onCancel } = props

  if (index === 0 && onCancel === undefined) {
    return null
  }

  if (index === 0) {
    return (
      <Button type="button" variant="outline" disabled={isDisabled} onClick={onCancel}>
        Cancelar
      </Button>
    )
  }

  return (
    <Button type="button" variant="outline" disabled={isDisabled} onClick={onBack}>
      <ArrowLeft aria-hidden data-icon="inline-start" />
      Voltar
    </Button>
  )
}

type ForwardButtonProps = {
  isLast: boolean
  isWorking: boolean
  isDisabled: boolean
  finishLabel: string
}

/** Continue between steps, the task's own verb on the last one; it submits the step's form. */
export function ForwardButton(props: ForwardButtonProps): JSX.Element {
  if (props.isLast) {
    return (
      <PendingButton type="submit" isPending={props.isWorking} disabled={props.isDisabled}>
        {props.finishLabel}
      </PendingButton>
    )
  }

  return (
    <Button type="submit" disabled={props.isDisabled}>
      Continuar
      <ArrowRight aria-hidden data-icon="inline-end" />
    </Button>
  )
}
