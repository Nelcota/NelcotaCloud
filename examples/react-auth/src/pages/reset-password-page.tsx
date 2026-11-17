import type { FormEvent, JSX } from 'react'
import { useEffect, useState } from 'react'

import { Card } from '../components/card'
import { FormFeedback } from '../components/form-feedback'
import { HomeLink } from '../components/home-link'
import { TextField } from '../components/text-field'
import { clearLinkToken, readLinkToken } from '../lib/link-token'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'

/** Opened from the email: `{site_url}/auth/reset-password#token=…`. */
export function ResetPasswordPage(): JSX.Element {
  const [token] = useState(readLinkToken)
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const { isPending, error, run } = useAction()

  useEffect(clearLinkToken, [])

  function reset(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void run(async () => {
      if (token === null) {
        throw new Error('Este link não tem um token. Peça um novo.')
      }

      await nelcota.auth.resetPassword({ token, password })
      setNotice('Senha alterada. Entre com a nova senha.')
    })
  }

  return (
    <Card title="Nova senha">
      <form className="stack" onSubmit={reset}>
        <TextField
          label="Nova senha"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <FormFeedback error={error} notice={notice} />
        <button type="submit" disabled={isPending}>
          Salvar senha
        </button>
      </form>
      <HomeLink />
    </Card>
  )
}
