import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { MfaLostAccess } from '@/modules/account/components/mfa-lost-access'
import { useVerifyMfaMutation } from '@/modules/account/queries/use-verify-mfa-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

const CODE_PATTERN = '[0-9 ]{6,7}'
const CODE_MAX_LENGTH = 7

type MfaChallengeFormProps = {
  mfaToken: string
  onSignedIn: () => void
}

/** Second step of a login when the account has TOTP on. */
export function MfaChallengeForm({ mfaToken, onSignedIn }: MfaChallengeFormProps): JSX.Element {
  const [code, setCode] = useState('')
  const verify = useVerifyMfaMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    verify.mutate({ mfaToken, code }, { onSuccess: onSignedIn })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Código de 6 dígitos"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={CODE_PATTERN}
        patternMessage="Digite os 6 números que aparecem no app."
        required
        autoFocus
        maxLength={CODE_MAX_LENGTH}
        className="h-12 text-center font-mono text-xl tracking-[0.4em] md:text-xl"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <ErrorAlert error={verify.error} />
      <Button type="submit" size="lg" disabled={verify.isPending} aria-busy={verify.isPending}>
        Entrar
      </Button>
      <MfaLostAccess />
    </form>
  )
}
