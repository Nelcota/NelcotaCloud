import type { JSX } from 'react'
import { useState } from 'react'

import { MfaDisableIllustration } from '@/modules/account/components/mfa-illustrations'
import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { useDisableTotpMutation } from '@/modules/account/queries/use-mfa'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

const TOTP_CODE_DIGITS = 6

/** Turning MFA off asks for a current code, so a stolen session alone cannot do it. */
export function TotpDisableForm(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('')
  const disabling = useDisableTotpMutation()

  function open(): void {
    setCode('')
    setIsOpen(true)
  }

  async function disable(): Promise<void> {
    await disabling.mutateAsync(code)
  }

  return (
    <div>
      <Button variant="destructive" size="sm" onClick={open}>
        Desativar MFA
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Desativar o MFA?"
        description="Sem MFA, quem descobrir sua senha entra no console e em todos os seus projetos."
        confirmLabel="Desativar MFA"
        illustration={<MfaDisableIllustration />}
        isDestructive
        canConfirm={digitsOf(code).length === TOTP_CODE_DIGITS}
        onConfirm={disable}
      >
        <TotpCodeField value={code} onChange={setCode} autoFocus />
      </ConfirmDialog>
    </div>
  )
}

/** The field accepts "123 456"; only the digits count. */
function digitsOf(code: string): string {
  return code.replace(/\D/g, '')
}
