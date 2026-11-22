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
      label="Desligar"
      size="md"
      title="Desligar o captcha?"
      description="Cadastro e login deixam de exigir o captcha na hora. A secret key guardada é apagada."
      confirmLabel="Desligar captcha"
      isDestructive
      isPending={isPending}
      onConfirm={onDisable}
    />
  )
}
