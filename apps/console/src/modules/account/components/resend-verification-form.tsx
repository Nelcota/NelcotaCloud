import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { EMAIL_FIELD_ICON } from '@/modules/account/model/field-icons'
import { EmailSentNotice } from '@/modules/account/components/email-sent-notice'
import { useResendVerificationMutation } from '@/modules/account/queries/use-email-verification'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

/**
 * The way forward from a confirmation link that failed: ask for a new one. The answer is the
 * same whether or not the address has an account waiting for confirmation.
 */
export function ResendVerificationForm(): JSX.Element {
  const [email, setEmail] = useState('')
  const resend = useResendVerificationMutation()

  if (resend.isSuccess) {
    return <EmailSentNotice email={email} purpose="verification" />
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    resend.mutate(email)
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Email da conta"
        icon={EMAIL_FIELD_ICON}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <ErrorAlert error={resend.error} />
      <Button type="submit" size="lg" disabled={resend.isPending} aria-busy={resend.isPending}>
        Enviar novo link
      </Button>
    </form>
  )
}
