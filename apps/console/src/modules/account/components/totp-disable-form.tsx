import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { useDisableTotpMutation } from '@/modules/account/queries/use-mfa'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

/** Turning MFA off asks for a current code, so a stolen session alone cannot do it. */
export function TotpDisableForm(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('')
  const disabling = useDisableTotpMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    disabling.mutate(code, { onSuccess: () => setIsOpen(false) })
  }

  if (isOpen === false) {
    return (
      <div>
        <Button variant="destructive" size="sm" onClick={() => setIsOpen(true)}>
          Desativar MFA
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4 border-t pt-4">
      <p className="text-sm text-pretty">
        Sem MFA, quem descobrir sua senha entra no console e em todos os seus projetos.
      </p>
      <TotpCodeField value={code} onChange={setCode} autoFocus />
      <ErrorAlert error={disabling.error} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={disabling.isPending}
          aria-busy={disabling.isPending}
        >
          Desativar MFA
        </Button>
      </div>
    </form>
  )
}
