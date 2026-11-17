import type { JSX } from 'react'

import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { Card } from './card'
import { FormFeedback } from './form-feedback'

export function AccountActions(): JSX.Element {
  const { isPending, error, run } = useAction()

  function signOut(): void {
    void run(() => nelcota.auth.signOut())
  }

  function deleteAccount(): void {
    if (
      window.confirm('Excluir sua conta e todos os seus dados? Não dá para desfazer.') === false
    ) {
      return
    }

    void run(() => nelcota.auth.deleteAccount())
  }

  return (
    <Card title="Conta">
      <FormFeedback error={error} />
      <div className="row">
        <button disabled={isPending} onClick={signOut}>
          Sair
        </button>
        <button className="danger" disabled={isPending} onClick={deleteAccount}>
          Excluir conta
        </button>
      </div>
    </Card>
  )
}
