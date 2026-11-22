import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

export function isBanned(user: User): boolean {
  return user.banned_at !== null && user.banned_at !== undefined
}

export function isVerified(user: User): boolean {
  return user.email_verified_at !== null && user.email_verified_at !== undefined
}
