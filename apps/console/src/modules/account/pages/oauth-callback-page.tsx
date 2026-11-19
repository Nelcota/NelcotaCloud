import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { OAUTH_CALLBACK_PATH } from '@/modules/account/api/oauth-login'
import { AuthCard } from '@/modules/account/components/auth-card'
import { SignInOutcome, SigningIn } from '@/modules/account/components/sign-in-outcome'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import { oauthFailureMessage } from '@/modules/account/model/oauth-failure-message'
import { useOAuthCallbackQuery } from '@/modules/account/queries/use-oauth-callback-query'
import { buttonVariants } from '@/shared/ui/button-variants'

/** Where Google or GitHub send the browser back: trades the code for a session. */
export function OAuthCallbackPage(): JSX.Element {
  const [callbackUrl] = useState(() => window.location.href)
  const callback = useOAuthCallbackQuery(callbackUrl)

  // The code is single-use; keep it out of the history and of anything copied from the bar.
  useEffect(() => {
    window.history.replaceState(null, '', OAUTH_CALLBACK_PATH)
  }, [])

  if (callback.error !== null) {
    return <CallbackFailed error={callback.error} />
  }

  if (callback.data === undefined) {
    return <SigningIn />
  }

  return <SignInOutcome result={callback.data} />
}

function CallbackFailed({ error }: { error: Error }): JSX.Element {
  return (
    <AuthCard
      title="Não deu para entrar"
      tabTitle="Não deu para entrar"
      description={oauthFailureMessage(error)}
      mark={AUTH_MARKS.failed}
    >
      <Link to="/login" className={buttonVariants({ size: 'lg' })}>
        Voltar para o login
      </Link>
    </AuthCard>
  )
}
