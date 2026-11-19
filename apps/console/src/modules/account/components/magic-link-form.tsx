import type { JSX, SubmitEvent } from 'react'

import { EMAIL_FIELD_ICON } from '@/modules/account/model/field-icons'
import { useSendMagicLinkMutation } from '@/modules/account/queries/use-magic-link'
import { prefersAutoFocus } from '@/shared/lib/prefers-auto-focus'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type MagicLinkFormProps = {
  /** Starts with what was typed on sign-in. */
  email: string
  onEmailChange: (email: string) => void
  onSent: (email: string) => void
}

/** Asks for a one-time login link: signing in without a password. */
export function MagicLinkForm(props: MagicLinkFormProps): JSX.Element {
  const { email, onEmailChange, onSent } = props
  const send = useSendMagicLinkMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    send.mutate(email, { onSuccess: () => onSent(email) })
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
      <ErrorAlert error={send.error} />
      <Button type="submit" size="lg" disabled={send.isPending} aria-busy={send.isPending}>
        Enviar link de acesso
      </Button>
    </form>
  )
}
