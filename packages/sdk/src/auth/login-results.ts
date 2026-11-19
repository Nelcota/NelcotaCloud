import type { components } from '../generated/api-schema'
import type { Session, SignInResult, SignUpResult } from './auth-types'
import { NelcotaError } from '../http/nelcota-error'
import { isRecord, isUser } from './user-shape'

type SessionTokens = components['schemas']['SessionTokens']
const MILLISECONDS_PER_SECOND = 1000
const INVALID_RESPONSE = 'invalid_response'

export function toSession(value: unknown, now: () => number = Date.now): Session {
  if (isSessionTokens(value) === false) {
    throw invalidResponse()
  }

  const tokens = value

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: now() + tokens.expires_in * MILLISECONDS_PER_SECOND,
    user: tokens.user,
  }
}

export function toSignInResult(value: unknown, now: () => number = Date.now): SignInResult {
  if (isRecord(value) === false) {
    throw invalidResponse()
  }

  if ('mfa_token' in value) {
    if (typeof value.mfa_token !== 'string' || value.mfa_token.length === 0) {
      throw invalidResponse()
    }

    return { kind: 'mfa_required', mfaToken: value.mfa_token }
  }

  return { kind: 'session', session: toSession(value, now) }
}

export function toSignUpResult(value: unknown, now: () => number = Date.now): SignUpResult {
  if (isRecord(value) === false) {
    throw invalidResponse()
  }

  if ('access_token' in value) {
    return { kind: 'session', session: toSession(value, now) }
  }

  if (value.verification_required === true) {
    return { kind: 'verification_required' }
  }

  throw invalidResponse()
}

function isSessionTokens(value: unknown): value is SessionTokens {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.access_token === 'string' &&
    value.access_token.length > 0 &&
    typeof value.refresh_token === 'string' &&
    value.refresh_token.length > 0 &&
    typeof value.expires_in === 'number' &&
    Number.isSafeInteger(value.expires_in) &&
    value.expires_in > 0 &&
    typeof value.token_type === 'string' &&
    isUser(value.user)
  )
}

function invalidResponse(): NelcotaError {
  return new NelcotaError({
    status: 502,
    code: INVALID_RESPONSE,
    message: 'The API returned an invalid authentication response',
    requestId: null,
  })
}
