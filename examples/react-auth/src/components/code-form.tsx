import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useAction } from '../lib/use-action'
import { FormFeedback } from './form-feedback'
import { TextField } from './text-field'

type CodeFormProps = { buttonLabel: string; submit: (code: string) => Promise<void> }

/** Asks for a 6-digit code from the authenticator app. */
export function CodeForm({ buttonLabel, submit }: CodeFormProps): JSX.Element {
  const [code, setCode] = useState('')
  const { isPending, error, run } = useAction()

  function send(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void run(() => submit(code))
  }

  return (
    <form className="stack" onSubmit={send}>
      <TextField
        label="Código do autenticador"
        type="text"
        value={code}
        onChange={setCode}
        autoComplete="one-time-code"
      />
      <FormFeedback error={error} />
      <button type="submit" disabled={isPending}>
        {buttonLabel}
      </button>
    </form>
  )
}
