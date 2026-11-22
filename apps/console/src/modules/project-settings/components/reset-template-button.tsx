import type { JSX } from 'react'

import { ConfirmButton } from '@/shared/ui/confirm-button'

type ResetTemplateButtonProps = {
  isCustomized: boolean
  isPending: boolean
  onReset: () => Promise<void>
}

/** Back to the platform's wording; offered only once the project has its own. */
export function ResetTemplateButton({
  isCustomized,
  isPending,
  onReset,
}: ResetTemplateButtonProps): JSX.Element | null {
  if (isCustomized === false) {
    return null
  }

  return (
    <ConfirmButton
      label="Usar texto padrão"
      title="Voltar ao texto padrão?"
      description="O texto deste email volta a ser o padrão da plataforma, em inglês. O seu se perde."
      confirmLabel="Usar texto padrão"
      isPending={isPending}
      onConfirm={onReset}
    />
  )
}
