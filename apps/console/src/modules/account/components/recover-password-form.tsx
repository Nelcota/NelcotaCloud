import type { JSX, SubmitEvent } from 'react'

import { EMAIL_FIELD_ICON } from '@/modules/account/model/field-icons'
import { useRecoverPasswordMutation } from '@/modules/account/queries/use-recover-password-mutation'
import { prefersAutoFocus } from '@/shared/lib/prefers-auto-focus'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type RecoverPasswordFormProps = {
  /** Starts with what was typed on sign-in. */
  email: string
  onEmailChange: (email: string) => void
  onSent: (email: string) => void
}

/** Asks for a reset link; the answer is the same whether or not the email has an account. */
export function RecoverPasswordForm(props: RecoverPasswordFormProps): JSX.Element {
  const { email, onEmailChange, onSent } = props
  const recover = useRecoverPasswordMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    recover.mutate(email, { onSuccess: () => onSent(email) })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Email"
        icon={EMAIL_FIELD_ICON}
        type="email"
        autoComplete="email"
        autoFocus={prefersAutoFocus()}
        required
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
      />
      <ErrorAlert error={recover.error} />
      <Button type="submit" size="lg" disabled={recover.isPending} aria-busy={recover.isPending}>
        Enviar link
      </Button>
    </form>
  )
}
