import type { MfaStatus, TotpEnrollment } from '@nelcota/sdk'
import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { Card } from './card'
import { CodeForm } from './code-form'
import { FormFeedback } from './form-feedback'

export function MfaSection(): JSX.Element {
  const [status, setStatus] = useState<MfaStatus | null>(null)
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const { isPending, error, run } = useAction()

  const reload = useCallback(async (): Promise<void> => {
    await run(async () => {
      setStatus(await nelcota.auth.mfa.getStatus())
    })
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  function enroll(): void {
    void run(async () => {
      setEnrollment(await nelcota.auth.mfa.enrollTotp())
    })
  }

  async function confirmEnrollment(code: string): Promise<void> {
    await nelcota.auth.mfa.verifyTotp({ code })
    setEnrollment(null)
    await reload()
  }

  async function disable(code: string): Promise<void> {
    await nelcota.auth.mfa.disableTotp({ code })
    await reload()
  }

  if (status?.totp_enabled === true) {
    return (
      <Card title="Verificação em duas etapas">
        <p>Ativa: cada login pede um código do autenticador.</p>
        <CodeForm buttonLabel="Desativar" submit={disable} />
      </Card>
    )
  }

  if (enrollment !== null) {
    return (
      <Card title="Verificação em duas etapas">
        <p>Adicione esta chave no seu app autenticador e digite o código que ele mostrar.</p>
        <code className="secret">{enrollment.secret}</code>
        <CodeForm buttonLabel="Ativar" submit={confirmEnrollment} />
      </Card>
    )
  }

  return (
    <Card title="Verificação em duas etapas">
      <p>Desativada.</p>
      <FormFeedback error={error} />
      <button className="secondary" disabled={isPending || status === null} onClick={enroll}>
        Configurar autenticador
      </button>
    </Card>
  )
}
