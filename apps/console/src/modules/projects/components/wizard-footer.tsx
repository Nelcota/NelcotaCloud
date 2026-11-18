import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'
import { BackButton, ForwardLabel } from '@/shared/ui/step-dialog/step-dialog-buttons'

type WizardFooterProps = {
  index: number
  isLast: boolean
  isWorking: boolean
  canContinue: boolean
  onBack: () => void
}

/**
 * Voltar and Continuar, like the guided dialogs; the last step's button creates the project. The
 * first step has no Voltar: the "Projetos" link above the page already leaves it.
 */
export function WizardFooter(props: WizardFooterProps): JSX.Element {
  return (
    <div className="-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end">
      <BackButton index={props.index} isDisabled={props.isWorking} onBack={props.onBack} />
      <Button
        type="submit"
        disabled={props.isWorking || props.canContinue === false}
        aria-busy={props.isWorking}
      >
        <ForwardLabel isLast={props.isLast} finishLabel="Criar projeto" />
      </Button>
    </div>
  )
}
