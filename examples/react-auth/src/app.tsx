import type { Session, SignInResult } from '@nelcota/sdk'
import type { JSX } from 'react'
import { useCallback, useState } from 'react'

import type { LoginHandler } from './lib/login-handler'
import { navigate, usePathname } from './lib/navigation'
import { useSession } from './lib/use-session'
import { MagicLinkPage } from './pages/magic-link-page'
import { MfaPage } from './pages/mfa-page'
import { OAuthCallbackPage } from './pages/oauth-callback-page'
import { ProfilePage } from './pages/profile-page'
import { ResetPasswordPage } from './pages/reset-password-page'
import { SignInPage } from './pages/sign-in-page'
import { VerifyEmailPage } from './pages/verify-email-page'

export function App(): JSX.Element {
  const session = useSession()
  const pathname = usePathname()
  const [mfaToken, setMfaToken] = useState<string | null>(null)

  const handleLogin = useCallback((result: SignInResult): void => {
    // A session is already stored by the SDK; an MFA step needs the code before it exists.
    if (result.kind === 'mfa_required') {
      setMfaToken(result.mfaToken)
      navigate('/')
      return
    }

    setMfaToken(null)
    navigate('/')
  }, [])

  const closeMfa = useCallback((): void => setMfaToken(null), [])

  return (
    <main className="page">
      <h1>Exemplo NelcotaCloud Auth</h1>
      <Route
        pathname={pathname}
        session={session}
        mfaToken={mfaToken}
        onLogin={handleLogin}
        onCloseMfa={closeMfa}
      />
    </main>
  )
}

type RouteProps = {
  pathname: string
  session: Session | null
  mfaToken: string | null
  onLogin: LoginHandler
  onCloseMfa: () => void
}

/** The paths of email links (`/auth/…`) are fixed by the API; everything else is the home page. */
function Route({ pathname, session, mfaToken, onLogin, onCloseMfa }: RouteProps): JSX.Element {
  if (pathname === '/auth/magic-link') {
    return <MagicLinkPage onLogin={onLogin} />
  }

  if (pathname === '/auth/callback') {
    return <OAuthCallbackPage onLogin={onLogin} />
  }

  if (pathname === '/auth/verify-email') {
    return <VerifyEmailPage />
  }

  if (pathname === '/auth/reset-password') {
    return <ResetPasswordPage />
  }

  if (session !== null) {
    return <ProfilePage session={session} />
  }

  if (mfaToken !== null) {
    return <MfaPage mfaToken={mfaToken} onClose={onCloseMfa} />
  }

  return <SignInPage onLogin={onLogin} />
}
