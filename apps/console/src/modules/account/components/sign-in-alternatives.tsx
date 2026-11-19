import LinkRound from '~icons/solar/link-round-linear'
import type { OAuthProvider } from '@nelcota/sdk'
import type { JSX } from 'react'
import { useState } from 'react'

import { startOAuthLogin } from '@/modules/account/api/oauth-login'
import { CONSOLE_OAUTH_PROVIDERS } from '@/shared/auth/console-oauth-providers'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { ProviderLogo } from '@/shared/ui/provider-logo'

const PROVIDER_NAMES: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
}

type SignInAlternativesProps = {
  /** Offers the emailed login link; only sign-in passes it. */
  onMagicLink?: () => void
}

/**
 * The other ways in, under the email form: a login link by email, then Google or GitHub when
 * the console has them configured. Nothing when there is no alternative.
 */
export function SignInAlternatives({ onMagicLink }: SignInAlternativesProps): JSX.Element | null {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<unknown>(null)

  if (onMagicLink === undefined && CONSOLE_OAUTH_PROVIDERS.length === 0) {
    return null
  }

  async function start(provider: OAuthProvider): Promise<void> {
    setError(null)
    setPendingProvider(provider)

    try {
      await startOAuthLogin(provider)
    } catch (caught) {
      setError(caught)
      setPendingProvider(null)
    }
  }

  return (
    <div className="grid gap-3">
      <OrDivider />
      <MagicLinkButton onMagicLink={onMagicLink} />
      {CONSOLE_OAUTH_PROVIDERS.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pendingProvider !== null}
          aria-busy={pendingProvider === provider}
          onClick={() => void start(provider)}
        >
          <ProviderLogo provider={provider} />
          Continuar com {PROVIDER_NAMES[provider]}
        </Button>
      ))}
      <ErrorAlert error={error} />
    </div>
  )
}

function MagicLinkButton({ onMagicLink }: SignInAlternativesProps): JSX.Element | null {
  if (onMagicLink === undefined) {
    return null
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onMagicLink}>
      <LinkRound aria-hidden="true" />
      Entrar com link por email
    </Button>
  )
}

function OrDivider(): JSX.Element {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-sm">
      <span aria-hidden="true" className="bg-border h-px flex-1" />
      ou
      <span aria-hidden="true" className="bg-border h-px flex-1" />
    </div>
  )
}
