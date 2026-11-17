import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { useEnrollTotpMutation, useVerifyTotpMutation } from '@/modules/account/queries/use-mfa'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { QrCode } from '@/shared/ui/qr-code'

/** Adds an authenticator in two steps: get its secret, then prove it with the first code. */
export function TotpEnrollment(): JSX.Element {
  const enrollment = useEnrollTotpMutation()
  const [code, setCode] = useState('')
  const verification = useVerifyTotpMutation()
  const pending = enrollment.data

  function verify(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    verification.mutate(code)
  }

  if (pending === undefined) {
    return (
      <div className="grid gap-3">
        <ErrorAlert error={enrollment.error} />
        <div>
          <Button
            disabled={enrollment.isPending}
            aria-busy={enrollment.isPending}
            onClick={() => enrollment.mutate()}
          >
            Ativar MFA
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={verify} className="grid gap-4 border-t pt-4">
      <ol className="text-muted-foreground grid list-decimal gap-1 pl-5 text-sm">
        <li>Abra seu app autenticador (Google Authenticator, 1Password, Authy…).</li>
        <li>Escaneie o QR code. Sem câmera? Digite a chave abaixo ou abra o link no celular.</li>
        <li>Digite o código de 6 dígitos que o app mostrar.</li>
      </ol>
      <QrCode
        value={pending.otpauth_uri}
        label="QR code para adicionar a conta no app autenticador"
      />
      <CopyableValue label="Chave do autenticador" value={pending.secret} />
      <a href={pending.otpauth_uri} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Abrir no app autenticador
      </a>
      <TotpCodeField value={code} onChange={setCode} autoFocus />
      <ErrorAlert error={verification.error} />
      <div>
        <Button type="submit" disabled={verification.isPending} aria-busy={verification.isPending}>
          Confirmar e ativar
        </Button>
      </div>
    </form>
  )
}
