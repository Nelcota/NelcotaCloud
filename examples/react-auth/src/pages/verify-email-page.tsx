import type { JSX } from 'react'
import { useState } from 'react'

import { clearLinkToken, readLinkToken } from '../lib/link-token'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { useRunOnce } from '../lib/use-run-once'
import { LinkStatus } from '../components/link-status'

/** Opened from the email: `{site_url}/auth/verify-email#token=…`. */
export function VerifyEmailPage(): JSX.Element {
  const [done, setDone] = useState<string | null>(null)
  const { error, run } = useAction()

  useRunOnce(() => {
    void run(async () => {
      const token = readLinkToken()
      clearLinkToken()

      if (token === null) {
        throw new Error('Este link não tem um token. Peça um novo.')
      }

      const user = await nelcota.auth.verifyEmail({ token })
      setDone(`E-mail ${user.email} confirmado. Já pode entrar.`)
    })
  })

  return <LinkStatus title="Confirmação de e-mail" error={error} done={done} />
}
