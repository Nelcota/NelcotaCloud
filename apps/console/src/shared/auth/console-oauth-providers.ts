import type { OAuthProvider } from '@nelcota/sdk'

const KNOWN_PROVIDERS: readonly OAuthProvider[] = ['google', 'github']

/**
 * The providers configured on the platform tenant, fixed at build time. The API answers an
 * unconfigured provider with a JSON error the browser would show as a page, so only these get
 * a button.
 */
export const CONSOLE_OAUTH_PROVIDERS: readonly OAuthProvider[] = parseProviders(
  import.meta.env.VITE_CONSOLE_OAUTH_PROVIDERS ?? '',
)

function parseProviders(value: string): OAuthProvider[] {
  const names = value.split(',').map((name) => name.trim().toLowerCase())

  return KNOWN_PROVIDERS.filter((provider) => names.includes(provider))
}
