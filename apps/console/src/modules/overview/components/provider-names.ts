const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

/** "GitHub" for `github`; an unknown provider keeps the name the API gave it. */
export function providerName(provider: string): string {
  return PROVIDER_NAMES[provider] ?? provider
}
