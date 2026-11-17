import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useVerifyMfaMutation } from '@/modules/account/queries/use-verify-mfa-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type MfaChallengeFormProps = {
  mfaToken: string
  onSignedIn: () => void
}

/** Second step of a login when the account has TOTP on. */
export function MfaChallengeForm({ mfaToken, onSignedIn }: MfaChallengeFormProps): JSX.Element {
  const [code, setCode] = useState('')
  const verify = useVerifyMfaMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    verify.mutate({ mfaToken, code }, { onSuccess: onSignedIn })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Código do autenticador"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        required
        autoFocus
        maxLength={7}
        className="h-12 text-center font-mono text-xl tracking-[0.4em] md:text-xl"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <ErrorAlert error={verify.error} />
      <Button type="submit" size="lg" disabled={verify.isPending} aria-busy={verify.isPending}>
        Confirmar
      </Button>
    </form>
  )
}
