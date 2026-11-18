import ArrowLeft from '~icons/solar/arrow-left-linear'
import ArrowRight from '~icons/solar/arrow-right-linear'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'

type BackButtonProps = {
  index: number
  isDisabled: boolean
  onBack: () => void
  /** Without it the first step has no button (a page, where a link above already leaves). */
  onCancel?: () => void
}

/** Cancel on the first step, Back after it: closing is never more than one click away (Esc). */
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
      <ArrowLeft />
      Voltar
    </Button>
  )
}

export function ForwardLabel({
  isLast,
  finishLabel,
}: {
  isLast: boolean
  finishLabel: string
}): JSX.Element {
  if (isLast) {
    return <>{finishLabel}</>
  }

  return (
    <>
      Continuar
      <ArrowRight />
    </>
  )
}
