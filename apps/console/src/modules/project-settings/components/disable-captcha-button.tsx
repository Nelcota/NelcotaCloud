import type { JSX } from 'react'

import { ConfirmButton } from '@/shared/ui/confirm-button'

type DisableCaptchaButtonProps = {
  siteKey: string | null
  isPending: boolean
  onDisable: () => Promise<void>
}

/** Turns the captcha off; offered only while it is on. */
export function DisableCaptchaButton({
  siteKey,
  isPending,
  onDisable,
}: DisableCaptchaButtonProps): JSX.Element | null {
  if (siteKey === null) {
    return null
  }

  return (
    <ConfirmButton
      label="Desativar"
      size="md"
      title="Desativar o captcha?"
      description="Cadastro e login deixam de exigir o captcha na hora. A secret key guardada é apagada."
      confirmLabel="Desativar captcha"
      isDestructive
      isPending={isPending}
      onConfirm={onDisable}
    />
  )
}
