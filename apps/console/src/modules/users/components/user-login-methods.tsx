import Letter from '~icons/solar/letter-linear'
import LockPassword from '~icons/solar/lock-password-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { ProviderLogo } from '@/shared/ui/provider-logo'

type User = components['schemas']['User']

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', github: 'GitHub' }

type LoginMethod = { key: string; name: string; mark: JSX.Element }

/**
 * How the user can get in, as small marks with their names for screen readers and on hover:
 * a password, each linked social account, or only an email link when they have neither.
 */
export function UserLoginMethods({ user }: { user: User }): JSX.Element {
  const methods = loginMethodsOf(user)

  return (
    <span className="text-muted-foreground flex items-center gap-1.5">
      {methods.map((method) => (
        <span key={method.key} title={method.name} className="inline-flex [&_svg]:size-4">
          {method.mark}
          <span className="sr-only">{method.name}</span>
        </span>
      ))}
    </span>
  )
}

function loginMethodsOf(user: User): LoginMethod[] {
  const social = user.providers.map(socialMethod)

  if (user.has_password) {
    return [passwordMethod(), ...social]
  }

  if (social.length === 0) {
    return [emailLinkMethod()]
  }

  return social
}

function passwordMethod(): LoginMethod {
  return {
    key: 'password',
    name: 'Senha',
    mark: <LockPassword aria-hidden="true" className="size-4" />,
  }
}

function emailLinkMethod(): LoginMethod {
  return {
    key: 'email-link',
    name: 'Link por email',
    mark: <Letter aria-hidden="true" className="size-4" />,
  }
}

function socialMethod(provider: string): LoginMethod {
  const name = PROVIDER_NAMES[provider] ?? provider

  if (provider === 'google' || provider === 'github') {
    return { key: provider, name, mark: <ProviderLogo provider={provider} /> }
  }

  return { key: provider, name, mark: <span className="text-xs">{name}</span> }
}
