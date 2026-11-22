import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

/** How the user can log in: a password, each linked social provider, or emailed links alone. */
export function signInMethods(user: User): string[] {
  const providers = user.providers.map((provider) => PROVIDER_NAMES[provider] ?? provider)

  if (user.has_password) {
    return ['Senha', ...providers]
  }

  if (providers.length === 0) {
    return ['Link por email']
  }

  return providers
}
