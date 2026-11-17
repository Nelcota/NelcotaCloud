import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { Card } from '../components/card'
import { FormFeedback } from '../components/form-feedback'
import { TextField } from '../components/text-field'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'

type MfaPageProps = { mfaToken: string; onClose: () => void }

/** Second login step for users with an authenticator app. */
export function MfaPage({ mfaToken, onClose }: MfaPageProps): JSX.Element {
  const [code, setCode] = useState('')
  const { isPending, error, run } = useAction()

  function verify(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    void run(async () => {
      await nelcota.auth.verifyMfa({ mfaToken, code })
      onClose()
    })
  }

  return (
    <Card title="Código do autenticador">
      <form className="stack" onSubmit={verify}>
        <TextField
          label="Código de 6 dígitos"
          type="text"
          value={code}
          onChange={setCode}
          autoComplete="one-time-code"
        />
        <FormFeedback error={error} />
        <div className="row">
          <button type="submit" disabled={isPending}>
            Confirmar
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  )
}
