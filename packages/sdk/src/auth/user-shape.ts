import type { User } from '../types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}

export function isNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

/** Checks the fields every user carries, for data from storage or the API. */
export function isUser(value: unknown): value is User {
  if (isRecord(value) === false) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.mfa_enabled === 'boolean' &&
    isNullableString(value.email_verified_at) &&
    isNullableString(value.banned_at)
  )
}
