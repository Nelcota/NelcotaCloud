import type { FormEvent, JSX, MouseEvent } from 'react'
import { useState } from 'react'

import type { LoginHandler } from '../lib/login-handler'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { FormFeedback } from './form-feedback'
import { TextField } from './text-field'

type PasswordFormProps = { onLogin: LoginHandler }

export function PasswordForm({ onLogin }: PasswordFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const { isPending, error, run } = useAction()

  function signIn(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void run(async () => {
      onLogin(await nelcota.auth.signInWithPassword({ email, password }))
    })
  }

  /** Outside the form's submit, so the browser's `required` and email checks run here. */
  function signUp(event: MouseEvent<HTMLButtonElement>): void {
    const form = event.currentTarget.form

    if (form === null || form.reportValidity() === false) {
      return
    }

    setNotice(null)
    void run(async () => {
      const result = await nelcota.auth.signUp({ email, password })

      if (result.kind === 'verification_required') {
        setNotice('Enviamos um link de confirmação para o seu e-mail.')
      }
    })
  }

  return (
    <form className="stack" onSubmit={signIn}>
      <TextField
        label="E-mail"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <TextField
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <FormFeedback error={error} notice={notice} />
      <div className="row">
        <button type="submit" disabled={isPending}>
          Entrar
        </button>
        <button type="button" className="secondary" disabled={isPending} onClick={signUp}>
          Criar conta
        </button>
      </div>
    </form>
  )
}
