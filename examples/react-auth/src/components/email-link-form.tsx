import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useAction } from '../lib/use-action'
import { FormFeedback } from './form-feedback'
import { TextField } from './text-field'

type EmailLinkFormProps = {
  buttonLabel: string
  sentNotice: string
  send: (email: string) => Promise<void>
}

/** Magic link and password recovery: both only ask for an email and send a link to it. */
export function EmailLinkForm({ buttonLabel, sentNotice, send }: EmailLinkFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const { isPending, error, run } = useAction()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setNotice(null)
    void run(async () => {
      await send(email)
      setNotice(sentNotice)
    })
  }

  return (
    <form className="stack" onSubmit={submit}>
      <TextField
        label="E-mail"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <FormFeedback error={error} notice={notice} />
      <button type="submit" className="secondary" disabled={isPending}>
        {buttonLabel}
      </button>
    </form>
  )
}
