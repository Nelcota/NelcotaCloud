import type { JSX } from 'react'

import { clearLinkToken, readLinkToken } from '../lib/link-token'
import type { LoginHandler } from '../lib/login-handler'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { useRunOnce } from '../lib/use-run-once'
import { LinkStatus } from '../components/link-status'

type MagicLinkPageProps = { onLogin: LoginHandler }

/** Opened from the email: `{site_url}/auth/magic-link#token=…`. */
export function MagicLinkPage({ onLogin }: MagicLinkPageProps): JSX.Element {
  const { error, run } = useAction()

  useRunOnce(() => {
    void run(async () => {
      const token = readLinkToken()
      clearLinkToken()

      if (token === null) {
        throw new Error('Este link não tem um token. Peça um novo.')
      }

      onLogin(await nelcota.auth.verifyMagicLink({ token }))
    })
  })

  return <LinkStatus title="Link mágico" error={error} done={null} />
}
