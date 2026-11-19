import type { JSX } from 'react'
import GitHubLogo from '~icons/logos/github-icon'
import GoogleLogo from '~icons/logos/google-icon'

import type { OAuthProvider } from '@nelcota/sdk'

/** The provider's own mark; GitHub's is near-black, so it inverts on the dark theme. */
export function ProviderLogo({ provider }: { provider: OAuthProvider }): JSX.Element {
  if (provider === 'github') {
    return <GitHubLogo className="size-5 shrink-0 dark:invert" />
  }

  return <GoogleLogo className="size-5 shrink-0" />
}
