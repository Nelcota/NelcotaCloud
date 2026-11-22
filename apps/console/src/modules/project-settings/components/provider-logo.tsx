import GitHubLogo from '~icons/logos/github-icon'
import GoogleLogo from '~icons/logos/google-icon'
import type { JSX } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { cn } from '@/shared/lib/utils'

type ProviderLogoProps = {
  provider: OAuthProviderName
  size?: 'sm' | 'md'
}

const SIZES = { sm: 'size-4', md: 'size-5' }

/** The provider's own mark; GitHub's is near-black, so it inverts on the dark theme. */
export function ProviderLogo({ provider, size = 'sm' }: ProviderLogoProps): JSX.Element {
  const sizeClass = SIZES[size]

  if (provider === 'github') {
    return <GitHubLogo aria-hidden className={cn('shrink-0 dark:invert', sizeClass)} />
  }

  return <GoogleLogo aria-hidden className={cn('shrink-0', sizeClass)} />
}
