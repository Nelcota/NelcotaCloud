import type { JSX } from 'react'

import type { LoginHandler } from '../lib/login-handler'
import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { useRunOnce } from '../lib/use-run-once'
import { LinkStatus } from '../components/link-status'

type OAuthCallbackPageProps = { onLogin: LoginHandler }

/** The provider's way back: trades the one-time code for a session with this tab's PKCE verifier. */
export function OAuthCallbackPage({ onLogin }: OAuthCallbackPageProps): JSX.Element {
  const { error, run } = useAction()

  useRunOnce(() => {
    void run(async () => {
      onLogin(await nelcota.auth.oauth.exchangeCode(window.location.href))
    })
  })

  return <LinkStatus title="Entrando" error={error} done={null} />
}
