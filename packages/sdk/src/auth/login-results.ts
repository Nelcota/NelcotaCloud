import type { components } from '../generated/api-schema'
import type { Session, SignInResult, SignUpResult } from '../types'

type SessionTokens = components['schemas']['SessionTokens']
type LoginResponse = components['schemas']['LoginResponse']
type SignUpResponse = components['schemas']['SignUpResponse']

const MILLISECONDS_PER_SECOND = 1000

export function toSession(tokens: SessionTokens): Session {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * MILLISECONDS_PER_SECOND,
    user: tokens.user,
  }
}

export function toSignInResult(response: LoginResponse): SignInResult {
  if ('mfa_token' in response) {
    return { kind: 'mfa_required', mfaToken: response.mfa_token }
  }

  return { kind: 'session', session: toSession(response) }
}

export function toSignUpResult(response: SignUpResponse): SignUpResult {
  if ('access_token' in response) {
    return { kind: 'session', session: toSession(response) }
  }

  return { kind: 'verification_required' }
}
