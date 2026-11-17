import type { OAuthProvider } from '@nelcota/sdk'
import type { JSX } from 'react'

import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { FormFeedback } from './form-feedback'

/** Where the provider sends the user back; it must be under the project's site URL. */
const CALLBACK_PATH = '/auth/callback'

export function OAuthButtons(): JSX.Element {
  const { isPending, error, run } = useAction()

  function signInWith(provider: OAuthProvider): void {
    void run(async () => {
      const redirectTo = `${window.location.origin}${CALLBACK_PATH}`
      window.location.assign(await nelcota.auth.oauth.getAuthorizeUrl({ provider, redirectTo }))
    })
  }

  return (
    <div className="stack">
      <div className="row">
        <button className="secondary" disabled={isPending} onClick={() => signInWith('google')}>
          Google
        </button>
        <button className="secondary" disabled={isPending} onClick={() => signInWith('github')}>
          GitHub
        </button>
      </div>
      <FormFeedback error={error} />
    </div>
  )
}
