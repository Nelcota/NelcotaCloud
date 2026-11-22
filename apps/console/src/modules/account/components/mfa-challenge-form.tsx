import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { useVerifyMfaMutation } from '@/modules/account/queries/use-verify-mfa-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'

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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TotpCodeField value={code} onChange={setCode} hasAutoFocus />
      <ErrorAlert error={verify.error} />
      <PendingButton
        type="submit"
        size="lg"
        className="w-full"
        isPending={verify.isPending}
        disabled={code.trim() === ''}
      >
        Confirmar
      </PendingButton>
    </form>
  )
}
